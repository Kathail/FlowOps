from __future__ import annotations

from datetime import datetime

from flask_login import UserMixin
from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Identity,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import Base
from app.models.mixins import (
    AuditableMixin,
    SoftDeleteMixin,
    TenantScopedMixin,
    TimestampMixin,
)


class Role(Base, TenantScopedMixin, TimestampMixin, AuditableMixin):
    __tablename__ = "role"
    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_role_tenant_id_code"),)

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=False), primary_key=True)
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)


class User(Base, TenantScopedMixin, TimestampMixin, SoftDeleteMixin, AuditableMixin, UserMixin):
    __tablename__ = "user"
    __table_args__ = (
        UniqueConstraint("tenant_id", "email", name="uq_user_tenant_id_email"),
        UniqueConstraint(
            "tenant_id",
            "employee_number",
            name="uq_user_tenant_id_employee_number",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=False), primary_key=True)
    user_uid: Mapped[str] = mapped_column(String(24), nullable=False, unique=True, index=True)
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    # Crew-floor identifier. Unique per tenant when set; nullable so the
    # demo / seed users created before the rollout don't have to backfill.
    employee_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    # Operator profile fields. `title` is purely display; `default_area_id`
    # is the operator's home territory (currently informational, but the
    # next iteration of territory routing will use it as a tie-breaker
    # when no daily roster covers the location). `notify_on_assignment`
    # opts the operator out of the WO-assigned email — defaults true so
    # newly-created users receive notifications by default.
    title: Mapped[str | None] = mapped_column(String(64), nullable=True)
    default_area_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("service_area.id", ondelete="SET NULL"),
        nullable=True,
    )
    notify_on_assignment: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    roles: Mapped[list[Role]] = relationship(
        "Role",
        secondary="user_role",
        lazy="selectin",
    )

    def get_id(self) -> str:
        return str(self.id)


class UserRole(Base):
    __tablename__ = "user_role"

    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("user.id", ondelete="CASCADE"),
        primary_key=True,
    )
    role_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("role.id", ondelete="CASCADE"),
        primary_key=True,
    )
