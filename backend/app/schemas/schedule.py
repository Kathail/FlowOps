from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

ScheduleKind = Literal["work_order", "inspection"]

# Inspection-kind enum mirrors app.models.inspection.InspectionKind so a
# schedule's spec.kind is rejected at the API boundary instead of at the
# tick-time DB insert. Source of truth for the values stays on the model.
_INSPECTION_KINDS = {
    "cctv",
    "hydrant_flow",
    "valve_exercise",
    "manhole",
    "catch_basin",
    "lift_station_round",
}


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


def _validate_inspection_spec_kind(kind: str, spec: dict[str, Any] | None) -> None:
    """Reject inspection schedules whose spec.kind isn't a real
    InspectionKind. Without this, a typo'd kind silently runs the
    "manhole" default at tick time forever, generating wrong-class
    inspections."""
    if kind != "inspection":
        return
    spec_kind = (spec or {}).get("kind")
    if spec_kind is not None and spec_kind not in _INSPECTION_KINDS:
        raise ValueError(
            f"spec.kind={spec_kind!r} is not a known inspection kind (expected one of {sorted(_INSPECTION_KINDS)})"
        )


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

    @model_validator(mode="after")
    def _check_inspection_spec(self) -> ScheduleCreate:
        _validate_inspection_spec_kind(self.kind, self.spec)
        return self


class ScheduleUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    rrule: str | None = Field(default=None, min_length=1)
    spec: dict[str, Any] | None = None
    asset_uid: str | None = None
    next_run_at: datetime | None = None
    active: bool | None = None

    # Note: ScheduleUpdate doesn't see the schedule's existing kind, so
    # spec validation here is best-effort against `inspection`. The
    # API patch handler runs the full check post-merge with the loaded
    # schedule's kind.


class ScheduleListResponse(BaseModel):
    items: list[ScheduleRead]


class ScheduleTickResponse(BaseModel):
    fired: int
    schedules_processed: int
    instances: list[str]
