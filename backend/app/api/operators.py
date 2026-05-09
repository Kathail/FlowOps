"""Supervisor-facing operator overview.

`/api/v1/operators/load` returns one row per active tech/supervisor with
the counts a supervisor uses to spot crew imbalance — open WOs, in-
progress, due-today, overdue — plus today's territory assignments.

Two design choices:
- The query returns *all* active tech/supervisor users (not just those
  with assigned work). A supervisor needs to know who's on-shift and
  who has zero load just as much as who has 5 emergencies.
- Counts use a single GROUP-BY query rather than N+1 selects per user.
  Today's territories are joined separately because the cardinality is
  tiny (≤ #areas per tenant).
"""

from __future__ import annotations

from datetime import date, datetime, timezone

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from sqlalchemy import func, select

from app.extensions import db
from app.models import DailyAssignment, Role, ServiceArea, User, UserRole, WorkOrder
from app.services.permissions import require_roles

operators_bp = Blueprint("operators", __name__, url_prefix="/api/v1/operators")


def _today_iso() -> str:
    """UTC date — picking a single timezone keeps roster lookups
    consistent regardless of where the server runs."""
    return datetime.now(timezone.utc).date().isoformat()


@operators_bp.get("/load")
@login_required
@require_roles("admin", "supervisor")
def operator_load():
    """Per-operator workload summary for the day.

    Query params:
      on_date  YYYY-MM-DD — defaults to today; controls which roster is
               surfaced. Counts (open / in_progress / overdue) are
               always *current* — the date param only narrows territory
               assignments, not WO state.
    """
    on_date_s = (request.args.get("on_date") or _today_iso()).strip()
    try:
        on_date = date.fromisoformat(on_date_s)
    except ValueError:
        on_date = datetime.now(timezone.utc).date()

    tenant_id = current_user.tenant_id
    now = datetime.now(timezone.utc)
    # All time math runs in UTC — using `date.today()` (server local TZ)
    # for `today_end` while `now` is UTC means a non-UTC server pegs
    # "due today" against the wrong day boundary. Pin both to UTC.
    today_utc = now.date()
    today_end = datetime.combine(today_utc, datetime.max.time(), tzinfo=timezone.utc)

    # 1. Eligible operators: active, tech or supervisor role.
    operator_stmt = (
        select(User)
        .join(UserRole, UserRole.user_id == User.id)
        .join(Role, Role.id == UserRole.role_id)
        .where(
            User.tenant_id == tenant_id,
            User.is_active.is_(True),
            User.deleted_at.is_(None),
            Role.code.in_(("tech", "supervisor")),
        )
        .distinct()
    )
    operators = list(db.session.scalars(operator_stmt).all())

    # 2. Aggregate WO counts per assignee in one query.
    open_status = ("open", "assigned")
    counts_stmt = (
        select(
            WorkOrder.assigned_to.label("user_id"),
            func.count().filter(WorkOrder.status.in_(open_status)).label("open_wos"),
            func.count().filter(WorkOrder.status == "in_progress").label("in_progress_wos"),
            func.count()
            .filter(
                WorkOrder.status.in_(("open", "assigned", "in_progress", "on_hold")),
                WorkOrder.due_by.is_not(None),
                WorkOrder.due_by < now,
            )
            .label("overdue_wos"),
            func.count()
            .filter(
                WorkOrder.status.in_(("open", "assigned", "in_progress", "on_hold")),
                WorkOrder.due_by.is_not(None),
                WorkOrder.due_by >= now,
                WorkOrder.due_by <= today_end,
            )
            .label("due_today_wos"),
            func.count()
            .filter(
                WorkOrder.status.in_(("open", "assigned", "in_progress", "on_hold")),
                WorkOrder.priority == "emergency",
            )
            .label("emergency_wos"),
        )
        .where(
            WorkOrder.tenant_id == tenant_id,
            WorkOrder.assigned_to.is_not(None),
            WorkOrder.deleted_at.is_(None),
        )
        .group_by(WorkOrder.assigned_to)
    )
    counts_by_user: dict[int, dict] = {}
    for row in db.session.execute(counts_stmt).mappings():
        counts_by_user[row["user_id"]] = {
            "open_wos": row["open_wos"],
            "in_progress_wos": row["in_progress_wos"],
            "overdue_wos": row["overdue_wos"],
            "due_today_wos": row["due_today_wos"],
            "emergency_wos": row["emergency_wos"],
        }

    # 3. Territory assignments for the requested date.
    rosters_by_user: dict[int, list[dict]] = {}
    rosters_stmt = (
        select(DailyAssignment, ServiceArea)
        .join(ServiceArea, ServiceArea.id == DailyAssignment.area_id)
        .where(
            DailyAssignment.tenant_id == tenant_id,
            DailyAssignment.on_date == on_date,
        )
        .order_by(DailyAssignment.priority.asc())
    )
    for da, area in db.session.execute(rosters_stmt).all():
        rosters_by_user.setdefault(da.user_id, []).append(
            {
                "id": area.id,
                "code": area.code,
                "name": area.name,
                "kind": area.kind,
                "priority": da.priority,
            }
        )

    # 4. Stitch.
    items = []
    for op in operators:
        c = counts_by_user.get(op.id, {})
        items.append(
            {
                "user_id": op.id,
                "user_uid": op.user_uid,
                "full_name": op.full_name,
                "employee_number": op.employee_number,
                "title": op.title,
                "email": op.email,
                "role_codes": sorted({r.code for r in op.roles}),
                "notify_on_assignment": op.notify_on_assignment,
                "open_wos": int(c.get("open_wos") or 0),
                "in_progress_wos": int(c.get("in_progress_wos") or 0),
                "overdue_wos": int(c.get("overdue_wos") or 0),
                "due_today_wos": int(c.get("due_today_wos") or 0),
                "emergency_wos": int(c.get("emergency_wos") or 0),
                "today_areas": rosters_by_user.get(op.id, []),
            }
        )

    # Sort: emergencies first, then most-overdue, then highest open count.
    items.sort(
        key=lambda i: (
            -i["emergency_wos"],
            -i["overdue_wos"],
            -i["open_wos"],
            i["full_name"].lower(),
        )
    )

    return jsonify({"items": items, "on_date": on_date.isoformat()})
