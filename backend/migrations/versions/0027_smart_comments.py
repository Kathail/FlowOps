"""add smart_comments to task_definition

Revision ID: 0027_smart_comments
Revises: 0026_categories
Create Date: 2026-05-06 06:30:00.000000

Smart comments are condition-evaluated, variable-interpolated text
suggestions that appear as tappable chips in the comment composer when
the operator is wrapping up a task. Suggestive only — never auto-apply.
The operator taps to insert, can edit freely, can ignore entirely.

Each entry:
    {
      "id": "stable_unique_id",
      "condition": "expression using same evaluator as show_if",
      "text": "Free text with {field_id} placeholders",
      "variables": ["field_id1", "field_id2"]
    }

Stored as a top-level JSONB column on task_definition. No schema-level
validation — Pydantic enforces the shape at API boundaries.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "0027_smart_comments"
down_revision = "0026_categories"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "task_definition",
        sa.Column(
            "smart_comments",
            JSONB,
            nullable=False,
            server_default="[]",
        ),
    )


def downgrade() -> None:
    op.drop_column("task_definition", "smart_comments")
