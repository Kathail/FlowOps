from __future__ import annotations

from datetime import date

from sqlalchemy import BigInteger, Date, ForeignKey, Identity, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.extensions import Base
from app.models.mixins import TenantScopedMixin, TimestampMixin


class DailyAssignment(Base, TenantScopedMixin, TimestampMixin):
    """One operator covering one service area on one date.

    Multiple rows per (date, area) → multiple operators on that
    territory; multiple rows per (user, date) → that operator covers
    multiple areas; the unique constraint prevents double-assigning the
    same operator to the same area on the same day. `priority` lets the
    auto-routing pick a "primary" when more than one operator covers a
    territory (lowest number wins).
    """

    __tablename__ = "daily_assignment"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "user_id",
            "area_id",
            "on_date",
            name="uq_daily_assignment_user_area_date",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=False), primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("user.id", ondelete="CASCADE"),
        nullable=False,
    )
    area_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("service_area.id", ondelete="CASCADE"),
        nullable=False,
    )
    on_date: Mapped[date] = mapped_column(Date, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    created_by: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("user.id", ondelete="SET NULL"),
        nullable=True,
    )
