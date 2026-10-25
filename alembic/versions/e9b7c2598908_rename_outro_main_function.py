"""rename outro main function

Revision ID: e9b7c2598908
Revises: 72af6d3b1c90
Create Date: 2026-09-29 23:29:45.603279

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e9b7c2598908'
down_revision: Union[str, Sequence[str], None] = '72af6d3b1c90'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
