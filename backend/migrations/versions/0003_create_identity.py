"""create role, user, user_role

Revision ID: 0003_identity
Revises: 0002_tenant
Create Date: 2026-05-05 12:02:00.000000

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0003_identity"
down_revision = "0002_tenant"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "role",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column("tenant_id", sa.BigInteger(), nullable=False),
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
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
        sa.ForeignKeyConstraint(
            ["tenant_id"], ["tenant.id"], name="fk_role_tenant_id_tenant", ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_role"),
        sa.UniqueConstraint("tenant_id", "code", name="uq_role_tenant_id_code"),
    )
    op.create_index("ix_role_tenant_id", "role", ["tenant_id"])

    op.create_table(
        "user",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column("tenant_id", sa.BigInteger(), nullable=False),
        sa.Column("user_uid", sa.String(length=24), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("full_name", sa.String(), nullable=False),
        sa.Column("phone", sa.String(length=32), nullable=True),
        sa.Column(
            "is_active", sa.Boolean(), server_default=sa.true(), nullable=False
        ),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
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
            ["tenant_id"], ["tenant.id"], name="fk_user_tenant_id_tenant", ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_user"),
        sa.UniqueConstraint("tenant_id", "email", name="uq_user_tenant_id_email"),
    )
    op.create_index("ix_user_user_uid", "user", ["user_uid"], unique=True)
    op.create_index("ix_user_tenant_id", "user", ["tenant_id"])
    op.create_index(
        "ix_user_active",
        "user",
        ["tenant_id", "is_active"],
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    op.create_table(
        "user_role",
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("role_id", sa.BigInteger(), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["user.id"], name="fk_user_role_user_id_user", ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["role_id"], ["role.id"], name="fk_user_role_role_id_role", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("user_id", "role_id", name="pk_user_role"),
    )


def downgrade() -> None:
    op.drop_table("user_role")
    op.drop_index("ix_user_active", table_name="user")
    op.drop_index("ix_user_tenant_id", table_name="user")
    op.drop_index("ix_user_user_uid", table_name="user")
    op.drop_table("user")
    op.drop_index("ix_role_tenant_id", table_name="role")
    op.drop_table("role")
