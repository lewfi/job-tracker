"""add is_priority to applications

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-10-21 00:00:01.000000

server_default false backfills every existing row, so no separate UPDATE
is needed.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, Sequence[str], None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'applications',
        sa.Column('is_priority', sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('applications', 'is_priority')
