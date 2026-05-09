from __future__ import annotations

from datetime import date as Date
from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api import validate_request as _validate
from app.errors import ConflictError, NotFoundError, ValidationError
from app.extensions import db
from app.models import DailyAssignment, ServiceArea, User
from app.schemas.daily_assignment import (
    DailyAssignmentCreate,
    DailyAssignmentListResponse,
    DailyAssignmentRead,
)
from app.services.permissions import require_roles

daily_assignments_bp = Blueprint(
    "daily_assignments", __name__, url_prefix="/api/v1/daily-assignments"
)


def _serialize(da: DailyAssignment) -> dict:
    """Hydrate the row with the operator + area display fields the
    planning UI renders. The page lists ~10–50 assignments per day so
    the per-row eager loads are fine; if this grows we can switch to a
    single JOIN.

    Uses select() instead of session.get() because session.get() hits
    the identity map and bypasses the tenant-filter listener — same
    anti-pattern called out in service_requests.py::_payload."""
    user = (
        db.session.scalar(select(User).where(User.id == da.user_id))
        if da.user_id else None
    )
    area = (
        db.session.scalar(select(ServiceArea).where(ServiceArea.id == da.area_id))
        if da.area_id else None
    )
    return {
        "id": da.id,
        "user_id": da.user_id,
        "area_id": da.area_id,
        "on_date": da.on_date.isoformat(),
        "priority": da.priority,
        "user_full_name": user.full_name if user else None,
        "user_employee_number": user.employee_number if user else None,
        "area_code": area.code if area else None,
        "area_name": area.name if area else None,
        "area_kind": area.kind if area else None,
    }


@daily_assignments_bp.get("")
@login_required
@require_roles("admin", "supervisor", "tech")
def list_daily_assignments():
    """List the day's roster. `?date=YYYY-MM-DD` filters; missing means
    today (in the server's local date — operators planning across
    midnight are an open question, not solved here)."""
    raw = request.args.get("date")
    if raw:
        try:
            on_date = Date.fromisoformat(raw)
        except ValueError as e:
            raise ValidationError("`date` must be YYYY-MM-DD", code="bad_date") from e
    else:
        on_date = datetime.now().date()

    rows = db.session.scalars(
        select(DailyAssignment)
        .where(DailyAssignment.on_date == on_date)
        .order_by(DailyAssignment.area_id, DailyAssignment.priority, DailyAssignment.id)
    ).all()
    return jsonify(
        DailyAssignmentListResponse(
            items=[DailyAssignmentRead.model_validate(_serialize(r)) for r in rows],
            on_date=on_date,
        ).model_dump(mode="json")
    )


@daily_assignments_bp.post("")
@login_required
@require_roles("admin", "supervisor")
def create_daily_assignment():
    data = _validate(DailyAssignmentCreate, request.get_json(silent=True) or {})

    # Tenant-scope check at the API layer — the listener filters reads,
    # but a supervisor could still attempt to assign across tenants by
    # sending another tenant's id. Both look-ups are tenant-filtered.
    user = db.session.scalar(select(User).where(User.id == data.user_id))
    if user is None:
        raise NotFoundError(f"user {data.user_id} not found", code="unknown_user")
    area = db.session.scalar(select(ServiceArea).where(ServiceArea.id == data.area_id))
    if area is None:
        raise NotFoundError(f"service area {data.area_id} not found", code="unknown_area")

    da = DailyAssignment(
        tenant_id=current_user.tenant_id,
        user_id=user.id,
        area_id=area.id,
        on_date=data.on_date,
        priority=data.priority,
        created_by=current_user.id,
    )
    db.session.add(da)
    try:
        db.session.commit()
    except IntegrityError as e:
        db.session.rollback()
        raise ConflictError(
            "this operator is already assigned to that area on that date",
            code="duplicate_assignment",
        ) from e
    db.session.refresh(da)
    return jsonify(_serialize(da)), 201


@daily_assignments_bp.delete("/<int:assignment_id>")
@login_required
@require_roles("admin", "supervisor")
def delete_daily_assignment(assignment_id: int):
    da = db.session.scalar(select(DailyAssignment).where(DailyAssignment.id == assignment_id))
    if da is None:
        raise NotFoundError(f"daily assignment {assignment_id} not found")
    db.session.delete(da)
    db.session.commit()
    return "", 204
