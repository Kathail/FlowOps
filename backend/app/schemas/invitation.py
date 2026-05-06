from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class InvitationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str | None = None
    role_codes: list[str]
    token_prefix: str
    expires_at: datetime
    accepted_at: datetime | None = None
    revoked_at: datetime | None = None
    invited_by: int | None = None
    created_at: datetime


class InvitationCreate(BaseModel):
    email: EmailStr
    full_name: str | None = Field(default=None, max_length=200)
    role_codes: list[str] = Field(default_factory=list)
    # Default 7 days; admin can override (but capped at 30 server-side).
    expires_in_days: int = Field(default=7, ge=1, le=30)


class InvitationCreateResponse(BaseModel):
    invitation: InvitationRead
    # The plaintext token + accept URL — only returned once, at create time.
    # Production wires this into the email body.
    token: str
    accept_url: str


class InvitationAccept(BaseModel):
    token: str = Field(min_length=20)
    full_name: str = Field(min_length=1, max_length=200)
    password: str = Field(min_length=12)


class InvitationListResponse(BaseModel):
    items: list[InvitationRead]
