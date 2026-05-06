"""create invitation

Revision ID: 0019_invitation
Revises: 0018_service_request
Create Date: 2026-05-06 00:00:00.000000

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0019_invitation"
down_revision = "0018_service_request"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "invitation",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column("tenant_id", sa.BigInteger(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("full_name", sa.String(length=200), nullable=True),
        # Token is Argon2-hashed; we store only the prefix (first 8 chars of
        # the raw token) for human-readable lookup in the admin UI.
        sa.Column("token_hash", sa.Text(), nullable=False),
        sa.Column("token_prefix", sa.String(length=12), nullable=False),
        sa.Column("invited_by", sa.BigInteger(), nullable=True),
        sa.Column(
            "role_codes",
            sa.ARRAY(sa.String(length=32)),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "expires_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("accepted_user_id", sa.BigInteger(), nullable=True),
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
            ["tenant_id"],
            ["tenant.id"],
            name="fk_invitation_tenant_id_tenant",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["invited_by"],
            ["user.id"],
            name="fk_invitation_invited_by_user",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["accepted_user_id"],
            ["user.id"],
            name="fk_invitation_accepted_user_id_user",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_invitation"),
        sa.UniqueConstraint(
            "tenant_id",
            "email",
            "accepted_at",
            name="uq_invitation_tenant_email_accepted",
        ),
    )
    op.create_index(
        "ix_invitation_token_prefix",
        "invitation",
        ["token_prefix"],
    )
    op.create_index(
        "ix_invitation_pending",
        "invitation",
        ["tenant_id"],
        postgresql_where=sa.text("accepted_at IS NULL AND revoked_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_invitation_pending", table_name="invitation")
    op.drop_index("ix_invitation_token_prefix", table_name="invitation")
    op.drop_table("invitation")
