from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

ScheduleKind = Literal["work_order", "inspection"]


class ScheduleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None = None
    kind: ScheduleKind
    rrule: str
    spec: dict[str, Any]
    asset_id: int | None = None
    next_run_at: datetime | None = None
    last_run_at: datetime | None = None
    active: bool
    created_by: int | None = None
    created_at: datetime
    updated_at: datetime
    # Filled in by API layer
    asset_uid: str | None = None


class ScheduleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    kind: ScheduleKind
    rrule: str = Field(min_length=1)
    spec: dict[str, Any] = Field(default_factory=dict)
    asset_uid: str | None = None
    # Optional manual override; defaults to first occurrence of the rrule
    # after creation time.
    next_run_at: datetime | None = None
    active: bool = True


class ScheduleUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    rrule: str | None = Field(default=None, min_length=1)
    spec: dict[str, Any] | None = None
    asset_uid: str | None = None
    next_run_at: datetime | None = None
    active: bool | None = None


class ScheduleListResponse(BaseModel):
    items: list[ScheduleRead]


class ScheduleTickResponse(BaseModel):
    fired: int
    schedules_processed: int
    instances: list[str]
