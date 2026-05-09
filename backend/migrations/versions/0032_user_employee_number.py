"""user: employee_number for crew-floor assignment

Revision ID: 0032_user_employee_number
Revises: 0031_wo_asset_task_data
Create Date: 2026-05-09 00:00:00.000000

Operators on the dispatch desk identify each other by employee number
rather than email — a supervisor radioing "assigning this main break to
1437" needs the WO assignment UI to take the same key. Nullable per
tenant during rollout so existing seed users don't fail validation; a
later migration can flip it once every operator profile carries one.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0032_user_employee_number"
down_revision = "0031_wo_asset_task_data"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user",
        sa.Column("employee_number", sa.String(length=32), nullable=True),
    )
    op.create_unique_constraint(
        "uq_user_tenant_id_employee_number",
        "user",
        ["tenant_id", "employee_number"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_user_tenant_id_employee_number", "user", type_="unique")
    op.drop_column("user", "employee_number")
