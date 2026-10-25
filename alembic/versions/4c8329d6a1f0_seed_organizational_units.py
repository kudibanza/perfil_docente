"""Seed the four UniLuanda organizational units.

Revision ID: 4c8329d6a1f0
Revises: b0a8695f5246
Create Date: 2026-09-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "4c8329d6a1f0"
down_revision: Union[str, Sequence[str], None] = "b0a8695f5246"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


UNITS = (
    ("INSTIC", "Instituto de Tecnologias de Informação e Comunicação"),
    ("IPGEST", "Instituto Politécnico de Gestão Logística e Transporte"),
    ("FaArtes", "Faculdade de Artes"),
    ("FSS", "Faculdade de Serviço Social"),
)


def upgrade() -> None:
    units = sa.table(
        "organizational_units",
        sa.column("id", sa.BigInteger()),
        sa.column("name", sa.String(length=200)),
        sa.column("code", sa.String(length=40)),
        sa.column("is_active", sa.Boolean()),
    )
    connection = op.get_bind()
    existing = connection.execute(
        sa.select(units.c.code, units.c.name)
    ).all()
    by_code = {row.code: row.name for row in existing}
    by_name = {row.name: row.code for row in existing}

    rows_to_insert = []
    for code, name in UNITS:
        if code in by_code:
            if by_code[code] != name:
                raise RuntimeError(
                    f"Organizational unit code {code!r} exists with a different name"
                )
            continue
        if name in by_name:
            raise RuntimeError(
                f"Organizational unit name {name!r} already exists under another code"
            )
        rows_to_insert.append({"code": code, "name": name, "is_active": True})

    if rows_to_insert:
        op.bulk_insert(units, rows_to_insert)


def downgrade() -> None:
    units = sa.table(
        "organizational_units",
        sa.column("code", sa.String(length=40)),
        sa.column("name", sa.String(length=200)),
    )
    connection = op.get_bind()
    for code, name in UNITS:
        connection.execute(
            sa.delete(units).where(units.c.code == code, units.c.name == name)
        )
