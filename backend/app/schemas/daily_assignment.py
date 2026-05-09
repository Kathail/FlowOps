from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class DailyAssignmentCreate(BaseModel):
    user_id: int
    area_id: int
    on_date: date
    priority: int = Field(default=1, ge=1, le=10)


class DailyAssignmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    area_id: int
    on_date: date
    priority: int
    user_full_name: str | None = None
    user_employee_number: str | None = None
    area_code: str | None = None
    area_name: str | None = None
    area_kind: str | None = None


class DailyAssignmentListResponse(BaseModel):
    items: list[DailyAssignmentRead]
    on_date: date
