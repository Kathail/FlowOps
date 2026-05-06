from __future__ import annotations

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    ForeignKey,
    Identity,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.extensions import Base
from app.models.mixins import (
    AuditableMixin,
    SoftDeleteMixin,
    TenantScopedMixin,
    TimestampMixin,
)

# Polymorphic link table — referential integrity enforced at the application
# layer. The `source_type` / `target_type` enums are duplicated as Python
# constants so we can validate inputs at the API boundary.
ENTITY_TYPES: tuple[str, ...] = ("work_order", "inspection", "service_request")
LINK_KINDS: tuple[str, ...] = ("parent_of", "related", "caused_by")


class EntityLink(Base, TenantScopedMixin, TimestampMixin, SoftDeleteMixin, AuditableMixin):
    __tablename__ = "entity_link"
    __table_args__ = (
        CheckConstraint(
            f"source_type IN ({', '.join(repr(v) for v in ENTITY_TYPES)})",
            name="ck_entity_link_source_type",
        ),
        CheckConstraint(
            f"target_type IN ({', '.join(repr(v) for v in ENTITY_TYPES)})",
            name="ck_entity_link_target_type",
        ),
        CheckConstraint(
            f"kind IN ({', '.join(repr(v) for v in LINK_KINDS)})",
            name="ck_entity_link_kind",
        ),
        CheckConstraint(
            "NOT (source_type = target_type AND source_id = target_id)",
            name="ck_entity_link_no_self_link",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=False), primary_key=True)
    source_type: Mapped[str] = mapped_column(String(32), nullable=False)
    source_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    target_type: Mapped[str] = mapped_column(String(32), nullable=False)
    target_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("user.id", ondelete="SET NULL"), nullable=True
    )
