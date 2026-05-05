"""create tenant

Revision ID: 0002_tenant
Revises: 0001_postgis
Create Date: 2026-05-05 12:01:00.000000

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0002_tenant"
down_revision = "0001_postgis"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tenant",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("settings", postgresql.JSONB(), nullable=False, server_default="{}"),
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
        sa.PrimaryKeyConstraint("id", name="pk_tenant"),
    )
    op.create_index("ix_tenant_slug", "tenant", ["slug"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_tenant_slug", table_name="tenant")
    op.drop_table("tenant")
