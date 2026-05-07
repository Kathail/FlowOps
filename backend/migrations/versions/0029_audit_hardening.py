"""audit hardening: work_order_asset tenant_id + updated_at, JSONB GIN indexes, crew_id index

Revision ID: 0029_audit_hardening
Revises: 0028_service_area
Create Date: 2026-05-07 04:00:00.000000

Three follow-ups from the deep audit:

1. ``work_order_asset`` is the only domain table missing ``tenant_id``
   and ``updated_at``. Tenancy enforcement currently happens by joining
   through work_order/asset; denorm tenant_id so the session-level
   filter (``app/services/tenancy.py``) covers it directly. ``updated_at``
   gives mutable rows (``completed_at``, ``notes``, ``sequence``) a
   honest mtime.

2. Filtered JSONB columns need GIN indexes. ``work_order.attrs`` and
   ``service_request.attrs`` are filtered in
   ``app/cli/simulate_year.py``; ``audit_log.before/after`` are filtered
   in ``app/api/history.py``. Without GIN, every read is a sequential
   scan against a monotonically-growing table.

3. ``work_order.crew_id`` is filtered in ``app/api/work_orders.py:list``
   but the only existing index is on ``assigned_to``.

The work_order_asset backfill is a single UPDATE — it inherits
tenant_id from the parent work_order in one statement, then we can
make the column NOT NULL.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "0029_audit_hardening"
down_revision = "0028_service_area"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1a. work_order_asset.tenant_id + updated_at
    op.add_column(
        "work_order_asset",
        sa.Column("tenant_id", sa.BigInteger(), nullable=True),
    )
    op.add_column(
        "work_order_asset",
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.execute(
        """
        UPDATE work_order_asset wa
           SET tenant_id = wo.tenant_id
          FROM work_order wo
         WHERE wa.work_order_id = wo.id
        """
    )
    op.alter_column("work_order_asset", "tenant_id", nullable=False)
    op.create_foreign_key(
        "fk_work_order_asset_tenant_id_tenant",
        "work_order_asset",
        "tenant",
        ["tenant_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index(
        "ix_work_order_asset_tenant_id",
        "work_order_asset",
        ["tenant_id"],
    )

    # 2. JSONB GIN indexes for filtered columns
    op.create_index(
        "ix_work_order_attrs",
        "work_order",
        ["attrs"],
        postgresql_using="gin",
        postgresql_ops={"attrs": "jsonb_path_ops"},
    )
    op.create_index(
        "ix_service_request_attrs",
        "service_request",
        ["attrs"],
        postgresql_using="gin",
        postgresql_ops={"attrs": "jsonb_path_ops"},
    )
    op.create_index(
        "ix_audit_log_before",
        "audit_log",
        ["before"],
        postgresql_using="gin",
        postgresql_ops={"before": "jsonb_path_ops"},
    )
    op.create_index(
        "ix_audit_log_after",
        "audit_log",
        ["after"],
        postgresql_using="gin",
        postgresql_ops={"after": "jsonb_path_ops"},
    )

    # 3. work_order.crew_id index — partial on active rows only.
    op.create_index(
        "ix_work_order_tenant_crew_active",
        "work_order",
        ["tenant_id", "crew_id"],
        postgresql_where=sa.text("deleted_at IS NULL AND crew_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_work_order_tenant_crew_active", table_name="work_order")
    op.drop_index("ix_audit_log_after", table_name="audit_log")
    op.drop_index("ix_audit_log_before", table_name="audit_log")
    op.drop_index("ix_service_request_attrs", table_name="service_request")
    op.drop_index("ix_work_order_attrs", table_name="work_order")
    op.drop_index("ix_work_order_asset_tenant_id", table_name="work_order_asset")
    op.drop_constraint(
        "fk_work_order_asset_tenant_id_tenant",
        "work_order_asset",
        type_="foreignkey",
    )
    op.drop_column("work_order_asset", "updated_at")
    op.drop_column("work_order_asset", "tenant_id")
