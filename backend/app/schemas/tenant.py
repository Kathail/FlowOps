from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class TenantRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    settings: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class TenantUpdate(BaseModel):
    name: str | None = None
    settings: dict[str, Any] | None = None
