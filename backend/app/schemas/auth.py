from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    tenant_slug: str = Field(min_length=2, max_length=64)
    email: EmailStr
    password: str = Field(min_length=1)


class PasswordChangeRequest(BaseModel):
    current: str = Field(min_length=1)
    new: str = Field(min_length=12)


class RegisterTenantRequest(BaseModel):
    tenant_name: str = Field(min_length=1, max_length=200)
    slug: str = Field(min_length=2, max_length=64, pattern=r"^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$")
    admin_email: EmailStr
    admin_password: str = Field(min_length=12)
    full_name: str = Field(min_length=1)
    phone: str | None = Field(default=None, max_length=32)
