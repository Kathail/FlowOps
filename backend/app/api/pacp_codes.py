from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_login import login_required
from sqlalchemy import select

from app.extensions import db
from app.models.pacp_code import PacpCode
from app.schemas.cctv import PacpCodeRead

pacp_codes_bp = Blueprint("pacp_codes", __name__, url_prefix="/api/v1/pacp-codes")


@pacp_codes_bp.get("")
@login_required
def list_pacp_codes():
    stmt = select(PacpCode).where(PacpCode.is_active.is_(True))

    group = request.args.get("group")
    if group:
        stmt = stmt.where(PacpCode.group == group)

    if request.args.get("structural") == "true":
        stmt = stmt.where(PacpCode.is_structural.is_(True))
    if request.args.get("om") == "true":
        stmt = stmt.where(PacpCode.is_om.is_(True))

    rows = db.session.scalars(
        stmt.order_by(PacpCode.group, PacpCode.code).execution_options(skip_tenant_filter=True)
    ).all()
    return jsonify([PacpCodeRead.model_validate(r).model_dump(mode="json") for r in rows])
