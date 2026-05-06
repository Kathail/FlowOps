"""Recurring-schedule helpers.

`tick(now)` walks every active schedule for the current tenant context whose
`next_run_at <= now`, instantiates the configured WorkOrder or Inspection
from the `spec` JSONB, stamps `schedule_id` on the new instance so the UI
can render a "Recurring" badge, and advances `next_run_at` to the next
rrule occurrence after `now`.

Validation note: we accept any rrule string that `dateutil.rrule.rrulestr`
will parse, which covers RFC 5545 RRULE syntax. We don't accept full VCALENDAR
blocks — keeps the schedule editor simple.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any

from dateutil.rrule import rrulestr
from flask import g
from sqlalchemy import select

from app.errors import ValidationError
from app.extensions import db
from app.models import Inspection, Schedule, WorkOrder
from app.services.inspection_number import next_inspection_number
from app.services.wo_number import next_wo_number

logger = logging.getLogger(__name__)


def parse_rrule(rule: str, *, dtstart: datetime | None = None):
    """Validate + parse an RRULE string. Raises ValidationError on bad input."""
    try:
        anchor = dtstart or datetime.now(UTC)
        return rrulestr(rule, dtstart=anchor)
    except (ValueError, TypeError) as e:
        raise ValidationError(f"invalid rrule: {e}", code="bad_rrule") from e


def next_occurrence_after(rule: str, after: datetime) -> datetime | None:
    """Return the first occurrence strictly after `after`, or None if the
    rrule has no more occurrences (UNTIL / COUNT exhausted)."""
    parsed = parse_rrule(rule, dtstart=after)
    nxt = parsed.after(after, inc=False)
    return nxt


def _instantiate_work_order(schedule: Schedule, now: datetime) -> WorkOrder:
    spec = schedule.spec or {}
    wo_number = next_wo_number(tenant_id=schedule.tenant_id)
    wo = WorkOrder(
        tenant_id=schedule.tenant_id,
        wo_number=wo_number,
        type=spec.get("type", "planned"),
        category=spec.get("category", "other"),
        priority=spec.get("priority", "normal"),
        status="open",
        title=spec.get("title") or schedule.name,
        description=spec.get("description"),
        asset_id=schedule.asset_id,
        scheduled_for=now,
        due_by=spec.get("due_by"),
        assigned_to=spec.get("assigned_to"),
        crew_id=spec.get("crew_id"),
        attrs=spec.get("attrs", {}),
        schedule_id=schedule.id,
        reported_by=schedule.created_by,
    )
    db.session.add(wo)
    db.session.flush()
    return wo


def _instantiate_inspection(schedule: Schedule, now: datetime) -> Inspection:
    spec = schedule.spec or {}
    n = next_inspection_number(tenant_id=schedule.tenant_id)
    ins = Inspection(
        tenant_id=schedule.tenant_id,
        inspection_number=n,
        kind=spec.get("kind") or "manhole",
        asset_id=schedule.asset_id,
        performed_at=now,
        performed_by=spec.get("performed_by"),
        data=spec.get("data", {}),
        notes=spec.get("notes"),
        schedule_id=schedule.id,
    )
    db.session.add(ins)
    db.session.flush()
    return ins


def tick(now: datetime | None = None) -> dict[str, Any]:
    """Process every due schedule in the current tenant context.

    Caller must set `g.tenant_id` (or `g.skip_tenant_filter = True` for the
    cron entry-point that scans every tenant). Returns a summary suitable
    for the API + CLI to log.
    """
    when = now or datetime.now(UTC)
    g.skip_tenant_filter = True  # CLI may run cross-tenant

    rows = db.session.scalars(
        select(Schedule).where(
            Schedule.active.is_(True),
            Schedule.deleted_at.is_(None),
            Schedule.next_run_at.is_not(None),
            Schedule.next_run_at <= when,
        )
    ).all()

    instances: list[str] = []
    fired = 0
    for s in rows:
        try:
            if s.kind == "work_order":
                wo = _instantiate_work_order(s, when)
                instances.append(wo.wo_number)
            elif s.kind == "inspection":
                ins = _instantiate_inspection(s, when)
                instances.append(ins.inspection_number)
            else:
                logger.warning("schedule %s has unknown kind=%r — skipping", s.id, s.kind)
                continue

            s.last_run_at = when
            try:
                s.next_run_at = next_occurrence_after(s.rrule, when)
            except ValidationError:
                # An rrule that no longer parses shouldn't kill the tick
                # for other schedules — disable this one and surface in the log.
                logger.exception("schedule %s rrule failed to parse; deactivating", s.id)
                s.active = False
                s.next_run_at = None
            fired += 1
        except Exception:
            logger.exception("schedule %s tick failed", s.id)
            db.session.rollback()
            continue

    db.session.commit()
    return {
        "fired": fired,
        "schedules_processed": len(rows),
        "instances": instances,
    }
