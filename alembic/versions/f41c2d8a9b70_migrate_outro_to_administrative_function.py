"""migrate OUTRO to administrative function

Revision ID: f41c2d8a9b70
Revises: e9b7c2598908
Create Date: 2026-09-29 23:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f41c2d8a9b70"
down_revision: Union[str, Sequence[str], None] = "e9b7c2598908"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_OLD_CATEGORY_CHECK = (
    "(main_function = 'DOCENTE' AND category IN "
    "('ASSISTENTE_ESTAGIARIO', 'ASSISTENTE', 'PROFESSOR_AUXILIAR', "
    "'PROFESSOR_ASSOCIADO', 'PROFESSOR_CATEDRATICO')) OR "
    "(main_function = 'INVESTIGADOR' AND category IN "
    "('ESTAGIARIO_INVESTIGACAO', 'ASSISTENTE_INVESTIGACAO', "
    "'INVESTIGADOR_AUXILIAR', 'INVESTIGADOR_PRINCIPAL')) OR "
    "(main_function = 'OUTRO' AND category IN "
    "('TECNICO_SUPERIOR', 'TECNICO_MEDIO', 'TECNICO_BASE'))"
)
_NEW_CATEGORY_CHECK = (
    "(main_function = 'DOCENTE' AND category IN "
    "('ASSISTENTE_ESTAGIARIO', 'ASSISTENTE', 'PROFESSOR_AUXILIAR', "
    "'PROFESSOR_ASSOCIADO', 'PROFESSOR_CATEDRATICO')) OR "
    "(main_function = 'INVESTIGADOR' AND category IN "
    "('ESTAGIARIO_INVESTIGACAO', 'ASSISTENTE_INVESTIGACAO', "
    "'INVESTIGADOR_AUXILIAR', 'INVESTIGADOR_PRINCIPAL')) OR "
    "(main_function = 'FUNCIONARIO_ADMINISTRATIVO' AND category IN "
    "('TECNICO_SUPERIOR', 'TECNICO_MEDIO', 'TECNICO_BASE'))"
)


def upgrade() -> None:
    """Rename OUTRO profiles and update the matching checks safely."""
    # Drop both old checks before the UPDATE. Otherwise MySQL rejects the new
    # function/category pair with error 3819.
    op.drop_constraint("chk_profiles_category_by_function", "profiles", type_="check")
    op.drop_constraint("chk_profiles_function", "profiles", type_="check")
    op.alter_column(
        "profiles",
        "main_function",
        existing_type=sa.String(length=20),
        type_=sa.String(length=40),
        existing_nullable=False,
    )
    op.execute(
        sa.text(
            "UPDATE profiles SET main_function = 'FUNCIONARIO_ADMINISTRATIVO' "
            "WHERE main_function = 'OUTRO'"
        )
    )
    op.create_check_constraint(
        "chk_profiles_function",
        "profiles",
        "main_function IN ('DOCENTE', 'INVESTIGADOR', 'FUNCIONARIO_ADMINISTRATIVO')",
    )
    op.create_check_constraint(
        "chk_profiles_category_by_function", "profiles", _NEW_CATEGORY_CHECK
    )


def downgrade() -> None:
    """Restore OUTRO and the original checks."""
    op.drop_constraint("chk_profiles_category_by_function", "profiles", type_="check")
    op.drop_constraint("chk_profiles_function", "profiles", type_="check")
    op.execute(
        sa.text(
            "UPDATE profiles SET main_function = 'OUTRO' "
            "WHERE main_function = 'FUNCIONARIO_ADMINISTRATIVO'"
        )
    )
    op.alter_column(
        "profiles",
        "main_function",
        existing_type=sa.String(length=40),
        type_=sa.String(length=20),
        existing_nullable=False,
    )
    op.create_check_constraint(
        "chk_profiles_function",
        "profiles",
        "main_function IN ('DOCENTE', 'INVESTIGADOR', 'OUTRO')",
    )
    op.create_check_constraint(
        "chk_profiles_category_by_function", "profiles", _OLD_CATEGORY_CHECK
    )
