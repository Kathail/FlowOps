from __future__ import annotations

from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class CctvObservation(BaseModel):
    distance_m: Decimal = Field(ge=0)
    code: str = Field(min_length=1, max_length=16)
    value_1: str | None = Field(default=None, max_length=32)
    value_2: str | None = Field(default=None, max_length=32)
    clock_from: int | None = Field(default=None, ge=1, le=12)
    clock_to: int | None = Field(default=None, ge=1, le=12)
    joint: bool = False
    continuous: bool = False
    severity: int | None = Field(default=None, ge=1, le=5)
    remarks: str | None = None
    photo_s3_key: str | None = None


class CctvRatings(BaseModel):
    structural_qr: int | None = Field(default=None, ge=1, le=5)
    om_qr: int | None = Field(default=None, ge=1, le=5)
    structural_total: int | None = Field(default=None, ge=0)
    om_total: int | None = Field(default=None, ge=0)


class CctvData(BaseModel):
    standard: Literal["PACP", "MACP", "LACP"] = "PACP"
    version: str = Field(default="7.0", max_length=16)
    upstream_mh: str | None = Field(default=None, max_length=64)
    downstream_mh: str | None = Field(default=None, max_length=64)
    direction: Literal["upstream", "downstream"] | None = None
    length_surveyed_m: Decimal | None = Field(default=None, ge=0)
    length_total_m: Decimal | None = Field(default=None, ge=0)
    media_url: str | None = None
    observations: list[CctvObservation] = Field(default_factory=list)
    ratings: CctvRatings | None = None

    model_config = ConfigDict(extra="forbid")


class PacpCodeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: str
    description: str
    group: str
    is_structural: bool
    is_om: bool
    default_severity: int | None = None
    is_active: bool
