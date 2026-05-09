"""inspection: add lifecycle status (submitted / approved)

Revision ID: 0035_inspection_status
Revises: 0034_user_profile_fields
Create Date: 2026-05-09 11:00:00.000000

Inspections were previously a flat record — a tech filled them in and
they were edited freely from then on. To match the WO/SR reopen story,
we introduce a small lifecycle:

  submitted → approved → (admin reopen) → submitted

`submitted` is the working state; `approved` is the locked terminal
state (only admins can approve, and only admins can reopen). Existing
rows backfill to `submitted` so the application keeps current behaviour
until a supervisor explicitly approves an inspection.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0035_inspection_status"
down_revision = "0034_user_profile_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "inspection",
        sa.Column(
            "status",
            sa.String(length=16),
            nullable=False,
            server_default="submitted",
        ),
    )
    op.create_check_constraint(
        "ck_inspection_status",
        "inspection",
        "status IN ('submitted', 'approved')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_inspection_status", "inspection", type_="check")
    op.drop_column("inspection", "status")
