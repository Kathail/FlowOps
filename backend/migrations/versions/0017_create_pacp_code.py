"""create + seed pacp_code

Revision ID: 0017_pacp_code
Revises: 0016_inspection
Create Date: 2026-05-05 12:16:00.000000

NASSCO's PACP 7.0 codebook is licensed; the seed below is a representative
subset chosen to cover all major groups (structural / O&M / continuous /
miscellaneous / construction features). Production deployments need a
NASSCO PACP license to import the full code set — the table is designed
to accept additions without schema changes.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0017_pacp_code"
down_revision = "0016_inspection"
branch_labels = None
depends_on = None


# (code, description, group, is_structural, is_om, default_severity)
PACP_CODES: list[tuple[str, str, str, bool, bool, int | None]] = [
    # Structural — Cracks
    ("CC", "Crack circumferential", "structural", True, False, 2),
    ("CL", "Crack longitudinal", "structural", True, False, 3),
    ("CM", "Crack multiple", "structural", True, False, 4),
    ("CS", "Crack spiral", "structural", True, False, 3),
    ("CH", "Crack hinge", "structural", True, False, 4),
    # Structural — Fractures
    ("FC", "Fracture circumferential", "structural", True, False, 4),
    ("FL", "Fracture longitudinal", "structural", True, False, 4),
    ("FM", "Fracture multiple", "structural", True, False, 5),
    ("FS", "Fracture spiral", "structural", True, False, 4),
    ("FH", "Fracture hinge", "structural", True, False, 5),
    # Structural — Broken / Hole / Deformed
    ("B", "Broken", "structural", True, False, 5),
    ("H", "Hole", "structural", True, False, 5),
    ("DD", "Deformed brick", "structural", True, False, 4),
    ("DR", "Deformed rigid pipe", "structural", True, False, 4),
    # Structural — Lining failure / Surface damage
    ("LFB", "Lining failure detached", "structural", True, False, 4),
    ("LFD", "Lining failure defective", "structural", True, False, 3),
    ("SAV", "Surface aggregate visible", "structural", True, False, 2),
    ("SRV", "Surface reinforcement visible", "structural", True, False, 4),
    # Joints
    ("JOM", "Joint offset medium", "structural", True, False, 3),
    ("JOL", "Joint offset large", "structural", True, False, 4),
    ("JSM", "Joint separated medium", "structural", True, False, 3),
    ("JSL", "Joint separated large", "structural", True, False, 4),
    # Infiltration
    ("IS", "Infiltration stain", "om", False, True, 1),
    ("IW", "Infiltration weeper", "om", False, True, 2),
    ("ID", "Infiltration dripper", "om", False, True, 3),
    ("IR", "Infiltration runner", "om", False, True, 4),
    ("IG", "Infiltration gusher", "om", False, True, 5),
    # O&M — Deposits / Roots / Obstruction / Damage
    ("DAR", "Deposits attached ringed", "om", False, True, 2),
    ("DAE", "Deposits attached encrustation", "om", False, True, 2),
    ("DSF", "Deposits sediment fine", "om", False, True, 1),
    ("DSC", "Deposits sediment coarse", "om", False, True, 2),
    ("DSGV", "Deposits sediment gravel", "om", False, True, 3),
    ("RFC", "Roots fine connection", "om", False, True, 1),
    ("RFJ", "Roots fine joint", "om", False, True, 2),
    ("RTB", "Roots tap branch", "om", False, True, 3),
    ("RMJ", "Roots medium joint", "om", False, True, 3),
    ("RMC", "Roots medium connection", "om", False, True, 3),
    ("OBI", "Obstruction intruding", "om", False, True, 4),
    ("OBP", "Obstruction protruding", "om", False, True, 4),
    # Construction features (informational)
    ("TF", "Tap factory", "construction", False, False, None),
    ("TS", "Tap saddle", "construction", False, False, None),
    ("TB", "Tap break-in", "construction", False, False, None),
    ("ISSC", "Intruding sealing material connection", "om", False, True, 2),
    # Continuous defects markers
    ("CN", "Continuous defect ends", "miscellaneous", False, False, None),
    # Miscellaneous / inspection
    ("AMH", "Access manhole", "miscellaneous", False, False, None),
    ("MGO", "Miscellaneous general observation", "miscellaneous", False, False, None),
    ("MWL", "Miscellaneous water level", "miscellaneous", False, False, None),
    ("MMA", "Miscellaneous multiple access", "miscellaneous", False, False, None),
    ("LL", "Line lost (camera)", "miscellaneous", False, False, None),
    ("ATV", "Abandoned vault", "miscellaneous", False, False, None),
    ("VC", "Vermin / cockroaches", "om", False, True, 1),
]


def upgrade() -> None:
    op.create_table(
        "pacp_code",
        sa.Column("code", sa.String(length=16), nullable=False),
        sa.Column("description", sa.String(), nullable=False),
        sa.Column("group", sa.String(length=32), nullable=False),
        sa.Column(
            "is_structural", sa.Boolean(), server_default=sa.false(), nullable=False
        ),
        sa.Column("is_om", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("default_severity", sa.Integer(), nullable=True),
        sa.Column(
            "is_active", sa.Boolean(), server_default=sa.true(), nullable=False
        ),
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
        sa.PrimaryKeyConstraint("code", name="pk_pacp_code"),
        sa.CheckConstraint(
            "default_severity IS NULL OR default_severity BETWEEN 1 AND 5",
            name="ck_pacp_code_severity",
        ),
        sa.CheckConstraint(
            "\"group\" IN ('structural', 'om', 'construction', 'miscellaneous')",
            name="ck_pacp_code_group",
        ),
    )

    pacp_code_table = sa.table(
        "pacp_code",
        sa.column("code", sa.String),
        sa.column("description", sa.String),
        sa.column("group", sa.String),
        sa.column("is_structural", sa.Boolean),
        sa.column("is_om", sa.Boolean),
        sa.column("default_severity", sa.Integer),
    )

    op.bulk_insert(
        pacp_code_table,
        [
            {
                "code": code,
                "description": desc,
                "group": grp,
                "is_structural": struct,
                "is_om": om,
                "default_severity": sev,
            }
            for code, desc, grp, struct, om, sev in PACP_CODES
        ],
    )


def downgrade() -> None:
    op.drop_table("pacp_code")
