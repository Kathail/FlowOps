from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RoleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: str
    name: str


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_uid: str
    email: EmailStr
    full_name: str
    phone: str | None = None
    employee_number: str | None = None
    title: str | None = None
    default_area_id: int | None = None
    notify_on_assignment: bool = True
    is_active: bool
    last_login_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    roles: list[RoleRead] = []


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1)
    phone: str | None = Field(default=None, max_length=32)
    employee_number: str | None = Field(default=None, max_length=32)
    title: str | None = Field(default=None, max_length=64)
    default_area_id: int | None = None
    notify_on_assignment: bool = True
    password: str = Field(min_length=12)
    role_codes: list[str] = []


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1)
    phone: str | None = Field(default=None, max_length=32)
    employee_number: str | None = Field(default=None, max_length=32)
    title: str | None = Field(default=None, max_length=64)
    default_area_id: int | None = None
    notify_on_assignment: bool | None = None
    is_active: bool | None = None


class UserSelfUpdate(BaseModel):
    """Subset of UserUpdate that an operator can set on themselves
    without admin role. Excludes `is_active` (deactivation is admin-only)
    and `employee_number` (changing your own crew-floor identifier could
    let someone impersonate another operator's audit trail)."""

    full_name: str | None = Field(default=None, min_length=1)
    phone: str | None = Field(default=None, max_length=32)
    title: str | None = Field(default=None, max_length=64)
    default_area_id: int | None = None
    notify_on_assignment: bool | None = None


class UserRolesUpdate(BaseModel):
    role_codes: list[str]


class UserListResponse(BaseModel):
    items: list[UserRead]
    page: int
    page_size: int
    total: int
