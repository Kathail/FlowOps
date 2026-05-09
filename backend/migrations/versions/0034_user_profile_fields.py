"""user profile fields: title, default_area_id, notify_on_assignment

Revision ID: 0034_user_profile_fields
Revises: 0033_daily_assignment
Create Date: 2026-05-09 09:00:00.000000

Operator profile additions to support the assignment-notification flow:
- `title`              — display string ("Field Tech II", "Crew Lead").
- `default_area_id`    — operator's home territory; informational for now,
                         and a future tie-breaker for territory routing.
- `notify_on_assignment` — opt-out switch. Defaults to true so the
                         feature works for everyone the day it ships;
                         operators flip it off from their profile.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0034_user_profile_fields"
down_revision = "0033_daily_assignment"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("user", sa.Column("title", sa.String(length=64), nullable=True))
    op.add_column(
        "user",
        sa.Column("default_area_id", sa.BigInteger(), nullable=True),
    )
    op.create_foreign_key(
        "fk_user_default_area_id_service_area",
        "user",
        "service_area",
        ["default_area_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.add_column(
        "user",
        sa.Column(
            "notify_on_assignment",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )


def downgrade() -> None:
    op.drop_column("user", "notify_on_assignment")
    op.drop_constraint(
        "fk_user_default_area_id_service_area", "user", type_="foreignkey"
    )
    op.drop_column("user", "default_area_id")
    op.drop_column("user", "title")
