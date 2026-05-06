"""create entity_link + schedule, add schedule_id to work_order + inspection

Revision ID: 0020_links_schedules
Revises: 0019_invitation
Create Date: 2026-05-06 02:00:00.000000

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0020_links_schedules"
down_revision = "0019_invitation"
branch_labels = None
depends_on = None

ENTITY_TYPES = ("work_order", "inspection", "service_request")
LINK_KINDS = ("parent_of", "related", "caused_by")
SCHEDULE_KINDS = ("work_order", "inspection")


def _enum(values: tuple[str, ...], column: str) -> str:
    return f"{column} IN ({', '.join(repr(v) for v in values)})"


def upgrade() -> None:
    # ------------- entity_link -------------
    op.create_table(
        "entity_link",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column("tenant_id", sa.BigInteger(), nullable=False),
        sa.Column("source_type", sa.String(length=32), nullable=False),
        sa.Column("source_id", sa.BigInteger(), nullable=False),
        sa.Column("target_type", sa.String(length=32), nullable=False),
        sa.Column("target_id", sa.BigInteger(), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_by", sa.BigInteger(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["tenant.id"],
            name="fk_entity_link_tenant_id_tenant",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["user.id"],
            name="fk_entity_link_created_by_user",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_entity_link"),
        sa.CheckConstraint(_enum(ENTITY_TYPES, "source_type"), name="ck_entity_link_source_type"),
        sa.CheckConstraint(_enum(ENTITY_TYPES, "target_type"), name="ck_entity_link_target_type"),
        sa.CheckConstraint(_enum(LINK_KINDS, "kind"), name="ck_entity_link_kind"),
        sa.CheckConstraint(
            "NOT (source_type = target_type AND source_id = target_id)",
            name="ck_entity_link_no_self_link",
        ),
    )
    # Partial unique index: same (source, target, kind) shouldn't repeat among
    # live links. Soft-deleted rows are allowed to coexist for audit history.
    op.create_index(
        "uq_entity_link_live",
        "entity_link",
        ["tenant_id", "source_type", "source_id", "target_type", "target_id", "kind"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_index(
        "ix_entity_link_source",
        "entity_link",
        ["tenant_id", "source_type", "source_id"],
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_index(
        "ix_entity_link_target",
        "entity_link",
        ["tenant_id", "target_type", "target_id"],
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    # ------------- schedule -------------
    op.create_table(
        "schedule",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column("tenant_id", sa.BigInteger(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("rrule", sa.Text(), nullable=False),
        sa.Column(
            "spec",
            postgresql.JSONB(),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("asset_id", sa.BigInteger(), nullable=True),
        sa.Column("next_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
        sa.Column("created_by", sa.BigInteger(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["tenant.id"],
            name="fk_schedule_tenant_id_tenant",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["asset_id"],
            ["asset.id"],
            name="fk_schedule_asset_id_asset",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["user.id"],
            name="fk_schedule_created_by_user",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_schedule"),
        sa.CheckConstraint(_enum(SCHEDULE_KINDS, "kind"), name="ck_schedule_kind"),
    )
    op.create_index(
        "uq_schedule_tenant_name",
        "schedule",
        ["tenant_id", "name"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_index(
        "ix_schedule_due",
        "schedule",
        ["tenant_id", "next_run_at"],
        postgresql_where=sa.text("active AND deleted_at IS NULL"),
    )

    # ------------- schedule_id on work_order + inspection -------------
    op.add_column(
        "work_order",
        sa.Column("schedule_id", sa.BigInteger(), nullable=True),
    )
    op.create_foreign_key(
        "fk_work_order_schedule_id_schedule",
        "work_order",
        "schedule",
        ["schedule_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_work_order_schedule_id",
        "work_order",
        ["tenant_id", "schedule_id"],
        postgresql_where=sa.text("schedule_id IS NOT NULL"),
    )

    op.add_column(
        "inspection",
        sa.Column("schedule_id", sa.BigInteger(), nullable=True),
    )
    op.create_foreign_key(
        "fk_inspection_schedule_id_schedule",
        "inspection",
        "schedule",
        ["schedule_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_inspection_schedule_id",
        "inspection",
        ["tenant_id", "schedule_id"],
        postgresql_where=sa.text("schedule_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_inspection_schedule_id", table_name="inspection")
    op.drop_constraint(
        "fk_inspection_schedule_id_schedule", "inspection", type_="foreignkey"
    )
    op.drop_column("inspection", "schedule_id")

    op.drop_index("ix_work_order_schedule_id", table_name="work_order")
    op.drop_constraint(
        "fk_work_order_schedule_id_schedule", "work_order", type_="foreignkey"
    )
    op.drop_column("work_order", "schedule_id")

    op.drop_index("ix_schedule_due", table_name="schedule")
    op.drop_index("uq_schedule_tenant_name", table_name="schedule")
    op.drop_table("schedule")

    op.drop_index("ix_entity_link_target", table_name="entity_link")
    op.drop_index("ix_entity_link_source", table_name="entity_link")
    op.drop_index("uq_entity_link_live", table_name="entity_link")
    op.drop_table("entity_link")
