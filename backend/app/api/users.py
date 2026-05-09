from __future__ import annotations

from datetime import UTC, datetime

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.api import validate_request as _validate
from app.errors import ConflictError, NotFoundError, ValidationError
from app.extensions import db
from app.models import Role, ServiceArea, User, UserRole
from app.schemas.user import (
    UserCreate,
    UserListResponse,
    UserRead,
    UserRolesUpdate,
    UserSelfUpdate,
    UserUpdate,
)
from app.services.auth import hash_password
from app.services.permissions import require_roles
from app.utils.uids import generate_user_uid

users_bp = Blueprint("users", __name__, url_prefix="/api/v1/users")


def _user_payload(user: User) -> dict:
    return UserRead.model_validate(user).model_dump(mode="json")


def _get_user_by_uid(user_uid: str) -> User:
    user = db.session.scalar(select(User).where(User.user_uid == user_uid))
    if not user:
        raise NotFoundError(f"user {user_uid} not found")
    return user


def _require_area_in_tenant(area_id: int | None) -> None:
    """Tenant guard for default_area_id writes. None is fine (clears the
    field); any non-null id must resolve to an area in this tenant. The
    DB FK doesn't enforce tenant scoping — it's a cross-tenant FK by
    schema, so the application layer has to."""
    if area_id is None:
        return
    found = db.session.scalar(
        select(ServiceArea.id).where(
            ServiceArea.id == area_id,
            ServiceArea.tenant_id == current_user.tenant_id,
        )
    )
    if not found:
        raise ValidationError(
            f"service area {area_id} not found", code="unknown_area"
        )


@users_bp.get("")
@login_required
@require_roles("admin", "supervisor")
def list_users():
    page = max(1, request.args.get("page", 1, type=int))
    page_size = min(200, max(1, request.args.get("page_size", 50, type=int)))
    q = (request.args.get("q") or "").strip()

    stmt = select(User)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            User.email.ilike(like)
            | User.full_name.ilike(like)
            | User.employee_number.ilike(like)
        )

    # Exact-match employee_number lookup — used by the WO/SR assignment
    # widget so a dispatcher can type "1437" and get the operator back
    # without scrolling. Returned via the same list shape so the caller
    # can reuse the existing rendering path.
    employee_number = (request.args.get("employee_number") or "").strip()
    if employee_number:
        stmt = stmt.where(User.employee_number == employee_number)

    total = db.session.scalar(select(func.count()).select_from(stmt.subquery())) or 0

    items = db.session.scalars(
        stmt.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    ).all()

    return jsonify(
        UserListResponse(
            items=[UserRead.model_validate(u) for u in items],
            page=page,
            page_size=page_size,
            total=total,
        ).model_dump(mode="json")
    )


@users_bp.post("")
@login_required
@require_roles("admin")
def create_user():
    data = _validate(UserCreate, request.get_json(silent=True) or {})
    _require_area_in_tenant(data.default_area_id)

    user = User(
        tenant_id=current_user.tenant_id,
        user_uid=generate_user_uid(),
        email=data.email.lower(),
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        phone=data.phone,
        employee_number=data.employee_number or None,
        title=data.title,
        default_area_id=data.default_area_id,
        notify_on_assignment=data.notify_on_assignment,
        is_active=True,
    )
    db.session.add(user)

    try:
        db.session.flush()
    except IntegrityError as e:
        db.session.rollback()
        # Two unique constraints share the same insert path; the message
        # we expose has to match which one tripped so the admin form can
        # render the field-specific error.
        msg = str(e.orig).lower() if e.orig else str(e).lower()
        if "employee_number" in msg:
            raise ConflictError(
                "employee number already exists in this tenant",
                code="employee_number_taken",
            ) from e
        raise ConflictError("email already exists in this tenant", code="email_taken") from e

    if data.role_codes:
        roles = db.session.scalars(select(Role).where(Role.code.in_(data.role_codes))).all()
        for r in roles:
            db.session.add(UserRole(user_id=user.id, role_id=r.id))

    db.session.commit()
    db.session.refresh(user)
    return jsonify(_user_payload(user)), 201


@users_bp.get("/me")
@login_required
def get_me():
    """Self-serve profile read. Available to any authenticated user —
    operators land here from `/<tenant>/profile` to view/edit their own
    contact info and notification preferences without admin help."""
    user = db.session.get(User, current_user.id)
    if not user:
        raise NotFoundError("user not found")
    return jsonify(_user_payload(user))


@users_bp.patch("/me")
@login_required
def update_me():
    """Self-serve profile edit — operators can change name/phone/title/
    default area/notify flag. Excludes role + active state (admin-only)
    and employee_number (audit-trail safety; only admins can change it)."""
    data = _validate(UserSelfUpdate, request.get_json(silent=True) or {})
    user = db.session.get(User, current_user.id)
    if not user:
        raise NotFoundError("user not found")

    # See update_user() for why we use model_fields_set rather than
    # `is not None`. Operators clearing their default territory in the
    # profile UI send `default_area_id: null`; the `is not None` form
    # silently dropped that update.
    fields_set = data.model_fields_set
    if "full_name" in fields_set and data.full_name is not None:
        user.full_name = data.full_name
    if "phone" in fields_set:
        user.phone = data.phone or None
    if "title" in fields_set:
        user.title = data.title or None
    if "default_area_id" in fields_set:
        _require_area_in_tenant(data.default_area_id)
        user.default_area_id = data.default_area_id
    if "notify_on_assignment" in fields_set and data.notify_on_assignment is not None:
        user.notify_on_assignment = data.notify_on_assignment

    db.session.commit()
    db.session.refresh(user)
    return jsonify(_user_payload(user))


@users_bp.get("/<string:user_uid>")
@login_required
@require_roles("admin")
def get_user(user_uid: str):
    user = _get_user_by_uid(user_uid)
    return jsonify(_user_payload(user))


@users_bp.patch("/<string:user_uid>")
@login_required
@require_roles("admin")
def update_user(user_uid: str):
    data = _validate(UserUpdate, request.get_json(silent=True) or {})
    user = _get_user_by_uid(user_uid)

    # `model_fields_set` distinguishes "client sent null" (clear the
    # field) from "client omitted the field" (leave it). The simple
    # `is not None` check we used earlier conflates both cases — so
    # an admin couldn't unset employee_number, default_area_id, etc.
    fields_set = data.model_fields_set
    if "full_name" in fields_set and data.full_name is not None:
        user.full_name = data.full_name
    if "phone" in fields_set:
        user.phone = data.phone
    if "employee_number" in fields_set:
        # Empty string clears the number for back-compat with form posts
        # that send "" rather than null.
        user.employee_number = data.employee_number or None
    if "title" in fields_set:
        user.title = data.title or None
    if "default_area_id" in fields_set:
        _require_area_in_tenant(data.default_area_id)
        user.default_area_id = data.default_area_id
    if "notify_on_assignment" in fields_set and data.notify_on_assignment is not None:
        user.notify_on_assignment = data.notify_on_assignment
    if "is_active" in fields_set and data.is_active is not None:
        user.is_active = data.is_active

    try:
        db.session.commit()
    except IntegrityError as e:
        db.session.rollback()
        msg = str(e.orig).lower() if e.orig else str(e).lower()
        if "employee_number" in msg:
            raise ConflictError(
                "employee number already exists in this tenant",
                code="employee_number_taken",
            ) from e
        raise
    db.session.refresh(user)
    return jsonify(_user_payload(user))


@users_bp.delete("/<string:user_uid>")
@login_required
@require_roles("admin")
def soft_delete_user(user_uid: str):
    user = _get_user_by_uid(user_uid)

    if user.id == current_user.id:
        raise ConflictError("cannot delete your own account", code="self_delete")

    # Don't let the tenant lock itself out by deleting its only remaining
    # admin. Count *other* active admins; refuse if there are none.
    if any(r.code == "admin" for r in user.roles):
        other_admins = db.session.scalar(
            select(func.count())
            .select_from(User)
            .join(UserRole, UserRole.user_id == User.id)
            .join(Role, Role.id == UserRole.role_id)
            .where(
                User.tenant_id == current_user.tenant_id,
                User.id != user.id,
                User.is_active.is_(True),
                User.deleted_at.is_(None),
                Role.code == "admin",
            )
        )
        if not other_admins:
            raise ConflictError(
                "cannot delete the only remaining admin — promote another user first",
                code="last_admin",
            )

    user.deleted_at = datetime.now(UTC)
    db.session.commit()
    return "", 204


@users_bp.post("/<string:user_uid>/roles")
@login_required
@require_roles("admin")
def update_user_roles(user_uid: str):
    data = _validate(UserRolesUpdate, request.get_json(silent=True) or {})
    user = _get_user_by_uid(user_uid)

    db.session.execute(UserRole.__table__.delete().where(UserRole.user_id == user.id))

    if data.role_codes:
        roles = db.session.scalars(select(Role).where(Role.code.in_(data.role_codes))).all()
        for r in roles:
            db.session.add(UserRole(user_id=user.id, role_id=r.id))

    db.session.commit()
    db.session.refresh(user)
    return jsonify(_user_payload(user))
