"""service_area: maintenance districts + water/sewer/storm systems

Revision ID: 0028_service_area
Revises: 0027_smart_comments
Create Date: 2026-05-06 16:30:00.000000

A municipality may carry many overlapping classifications: 3-5
maintenance districts for crew assignment, one or more water
distribution systems (regulatory), separate wastewater collection
systems, and storm drainage areas. They don't always overlap, and the
boundaries change. service_area gives a single polygon-bearing table
with a kind discriminator so a tenant can carry as many of each as
they need without schema churn.

`kind` is a CHECK enum, not a separate table — the four current values
exhaust the operational vocabulary. Add 'pressure_zone' or
'pumping_zone' later if needed.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from geoalchemy2 import Geometry
from sqlalchemy.dialects.postgresql import JSONB

revision = "0028_service_area"
down_revision = "0027_smart_comments"
branch_labels = None
depends_on = None

KINDS = ("maintenance", "water_system", "sewer_system", "storm_system")


def upgrade() -> None:
    op.create_table(
        "service_area",
        sa.Column("id", sa.BigInteger, sa.Identity(), primary_key=True),
        sa.Column(
            "tenant_id",
            sa.BigInteger,
            sa.ForeignKey("tenant.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("code", sa.Text, nullable=False),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column(
            "geom",
            Geometry(geometry_type="MULTIPOLYGON", srid=4326),
            nullable=False,
        ),
        sa.Column("color", sa.String(16), nullable=True),
        sa.Column(
            "parent_id",
            sa.BigInteger,
            sa.ForeignKey("service_area.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "attrs",
            JSONB,
            nullable=False,
            server_default="{}",
        ),
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
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("tenant_id", "code", name="uq_service_area_tenant_code"),
        sa.CheckConstraint(
            f"kind IN ({', '.join(repr(k) for k in KINDS)})",
            name="ck_service_area_kind",
        ),
    )
    op.create_index(
        "ix_service_area_tenant_kind",
        "service_area",
        ["tenant_id", "kind"],
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.execute(
        "CREATE INDEX ix_service_area_geom ON service_area USING GIST (geom)"
    )


def downgrade() -> None:
    op.drop_index("ix_service_area_geom", table_name="service_area")
    op.drop_index("ix_service_area_tenant_kind", table_name="service_area")
    op.drop_table("service_area")
