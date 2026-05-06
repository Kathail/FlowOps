from __future__ import annotations

from typing import Any

import jsonschema
from flask import Blueprint, jsonify, request
from flask_login import login_required
from jsonschema.exceptions import SchemaError as JsonSchemaError
from pydantic import BaseModel, ConfigDict, Field
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy import select

from app.errors import NotFoundError, ValidationError
from app.extensions import db
from app.models import AssetClass
from app.schemas.asset import AssetClassRead
from app.services.audit import emit_event
from app.services.permissions import require_roles

asset_classes_bp = Blueprint("asset_classes", __name__, url_prefix="/api/v1/asset-classes")


class AssetClassUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=200)
    geometry_type: str | None = None
    attribute_schema: dict[str, Any] | None = None
    default_criticality: int | None = Field(default=None, ge=1, le=5)
    icon: str | None = Field(default=None, max_length=64)
    color: str | None = Field(default=None, max_length=16)
    is_active: bool | None = None


def _payload(ac: AssetClass) -> dict:
    return AssetClassRead.model_validate(ac).model_dump(mode="json")


@asset_classes_bp.get("")
@login_required
def list_asset_classes():
    items = db.session.scalars(
        select(AssetClass)
        .order_by(AssetClass.domain, AssetClass.code)
        .execution_options(skip_tenant_filter=True)
    ).all()
    return jsonify([_payload(ac) for ac in items])


@asset_classes_bp.get("/<string:code>")
@login_required
def get_asset_class(code: str):
    ac = db.session.get(AssetClass, code)
    if not ac:
        raise NotFoundError(f"asset class {code} not found")
    return jsonify(_payload(ac))


@asset_classes_bp.patch("/<string:code>")
@login_required
@require_roles("admin")
def update_asset_class(code: str):
    """Edit a class's attribute_schema (and a few cosmetics).

    `attribute_schema` is validated as a JSON Schema *meta-schema* (i.e. the
    schema itself must be a valid Draft-2020 schema). We don't validate
    existing assets against the new schema here — that's a destructive
    re-validation step we'll surface in S12 hardening.
    """
    ac = db.session.get(AssetClass, code)
    if not ac:
        raise NotFoundError(f"asset class {code} not found")

    try:
        data = AssetClassUpdate.model_validate(request.get_json(silent=True) or {})
    except PydanticValidationError as e:
        raise ValidationError(str(e.errors())) from e

    if data.attribute_schema is not None:
        try:
            jsonschema.Draft202012Validator.check_schema(data.attribute_schema)
        except JsonSchemaError as e:
            raise ValidationError(
                f"attribute_schema is not a valid JSON Schema: {e.message}",
                code="bad_schema",
            ) from e

    before = {
        "name": ac.name,
        "attribute_schema": ac.attribute_schema,
        "default_criticality": ac.default_criticality,
        "icon": ac.icon,
        "color": ac.color,
        "is_active": ac.is_active,
    }

    if data.name is not None:
        ac.name = data.name
    if data.geometry_type is not None:
        ac.geometry_type = data.geometry_type
    if data.attribute_schema is not None:
        ac.attribute_schema = data.attribute_schema
    if data.default_criticality is not None:
        ac.default_criticality = data.default_criticality
    if data.icon is not None:
        ac.icon = data.icon
    if data.color is not None:
        ac.color = data.color
    if data.is_active is not None:
        ac.is_active = data.is_active

    emit_event(
        action="asset_class_update",
        entity_type="AssetClass",
        entity_id=ac.code,
        before=before,
        after={
            "name": ac.name,
            "attribute_schema": ac.attribute_schema,
            "default_criticality": ac.default_criticality,
            "icon": ac.icon,
            "color": ac.color,
            "is_active": ac.is_active,
        },
    )
    db.session.commit()
    db.session.refresh(ac)
    return jsonify(_payload(ac))
