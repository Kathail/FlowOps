from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from pydantic import ValidationError as PydanticValidationError

from app.errors import ForbiddenError, NotFoundError, ValidationError
from app.extensions import db
from app.models import Tenant
from app.schemas.tenant import TenantRead, TenantUpdate

tenant_bp = Blueprint("tenant", __name__, url_prefix="/api/v1/tenant")


def _require_admin() -> None:
    user = current_user._get_current_object()
    if not any(r.code == "admin" for r in user.roles):
        raise ForbiddenError("admin role required")


def _tenant_payload(t: Tenant) -> dict:
    return TenantRead.model_validate(t).model_dump(mode="json")


def _get_current_tenant() -> Tenant:
    tenant = db.session.get(Tenant, current_user.tenant_id)
    if not tenant:
        raise NotFoundError("tenant not found")
    return tenant


@tenant_bp.get("")
@login_required
def get_tenant():
    return jsonify(_tenant_payload(_get_current_tenant()))


@tenant_bp.patch("")
@login_required
def update_tenant():
    _require_admin()
    try:
        data = TenantUpdate.model_validate(request.get_json(silent=True) or {})
    except PydanticValidationError as e:
        raise ValidationError(str(e.errors())) from e

    tenant = _get_current_tenant()
    if data.name is not None:
        tenant.name = data.name
    if data.settings is not None:
        tenant.settings = data.settings

    db.session.commit()
    return jsonify(_tenant_payload(tenant))
