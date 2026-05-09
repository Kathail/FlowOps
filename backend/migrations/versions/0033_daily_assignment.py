"""daily_assignment: per-day operator-to-territory roster

Revision ID: 0033_daily_assignment
Revises: 0032_user_employee_number
Create Date: 2026-05-09 04:00:00.000000

Supervisors plan a shift by assigning operators to service areas for a
specific date. When an SR or WO is created with a location, the dispatch
flow looks up today's operator(s) for any containing area and defaults
the assignee — taking a previously manual radio call ("send 1437 to that
hydrant") and making it the obvious system default.

A user can cover multiple areas in a day, and an area can have multiple
operators (primary + backup); the unique constraint is the full triple
(user_id, area_id, date) so the same operator can't be double-assigned
to the same area on the same day.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0033_daily_assignment"
down_revision = "0032_user_employee_number"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "daily_assignment",
        sa.Column("id", sa.BigInteger, sa.Identity(always=False), primary_key=True),
        sa.Column("tenant_id", sa.BigInteger, nullable=False),
        sa.Column("user_id", sa.BigInteger, nullable=False),
        sa.Column("area_id", sa.BigInteger, nullable=False),
        sa.Column("on_date", sa.Date, nullable=False),
        sa.Column("priority", sa.Integer, nullable=False, server_default="1"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("created_by", sa.BigInteger, nullable=True),
        sa.ForeignKeyConstraint(
            ["tenant_id"], ["tenant.id"],
            name="fk_daily_assignment_tenant_id_tenant",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["user.id"],
            name="fk_daily_assignment_user_id_user",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["area_id"], ["service_area.id"],
            name="fk_daily_assignment_area_id_service_area",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["created_by"], ["user.id"],
            name="fk_daily_assignment_created_by_user",
            ondelete="SET NULL",
        ),
        sa.UniqueConstraint(
            "tenant_id",
            "user_id",
            "area_id",
            "on_date",
            name="uq_daily_assignment_user_area_date",
        ),
    )
    op.create_index(
        "ix_daily_assignment_tenant_date",
        "daily_assignment",
        ["tenant_id", "on_date"],
    )
    op.create_index(
        "ix_daily_assignment_area_date",
        "daily_assignment",
        ["area_id", "on_date"],
    )


def downgrade() -> None:
    op.drop_index("ix_daily_assignment_area_date", table_name="daily_assignment")
    op.drop_index("ix_daily_assignment_tenant_date", table_name="daily_assignment")
    op.drop_table("daily_assignment")
