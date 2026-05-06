from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

EntityType = Literal["work_order", "inspection", "service_request"]
LinkKind = Literal["parent_of", "related", "caused_by"]


class LinkRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source_type: EntityType
    source_id: int
    target_type: EntityType
    target_id: int
    kind: LinkKind
    note: str | None = None
    created_by: int | None = None
    created_at: datetime
    # Filled in by the API layer when serializing — human-readable refs so
    # the UI can render the linked item without an extra round-trip.
    source_ref: str | None = None
    target_ref: str | None = None


class LinkCreate(BaseModel):
    source_type: EntityType
    source_id: int
    target_type: EntityType
    target_id: int
    kind: LinkKind = "related"
    note: str | None = Field(default=None, max_length=500)


class LinkListResponse(BaseModel):
    items: list[LinkRead]
