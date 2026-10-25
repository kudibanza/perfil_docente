"""Require consecutive years in teaching assignment academic_year.

Revision ID: 6de8f3c2a941
Revises: 4c8329d6a1f0
Create Date: 2026-09-28

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "6de8f3c2a941"
down_revision: Union[str, Sequence[str], None] = "4c8329d6a1f0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


CONSTRAINT_NAME = "chk_profile_disciplines_consecutive_academic_year"
CONSTRAINT_SQL = (
    "CAST(SUBSTRING(academic_year, 6, 4) AS UNSIGNED) = "
    "CAST(SUBSTRING(academic_year, 1, 4) AS UNSIGNED) + 1"
)


def upgrade() -> None:
    invalid_years = op.get_bind().execute(
        sa.text(
            "SELECT id, academic_year FROM profile_disciplines "
            "WHERE academic_year NOT REGEXP '^[0-9]{4}/[0-9]{4}$' "
            "OR CAST(SUBSTRING(academic_year, 6, 4) AS UNSIGNED) "
            "<> CAST(SUBSTRING(academic_year, 1, 4) AS UNSIGNED) + 1"
        )
    ).all()
    if invalid_years:
        rows = ", ".join(f"id={row.id}: {row.academic_year}" for row in invalid_years)
        raise RuntimeError(
            "Correct academic_year values before migrating; expected consecutive years in "
            f"YYYY/YYYY format. Invalid records: {rows}"
        )
    op.create_check_constraint(
        CONSTRAINT_NAME,
        "profile_disciplines",
        CONSTRAINT_SQL,
    )


def downgrade() -> None:
    op.drop_constraint(
        CONSTRAINT_NAME,
        "profile_disciplines",
        type_="check",
    )
