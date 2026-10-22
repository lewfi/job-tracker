"""add idempotency_key to applications

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-10-21 00:00:02.000000

Nullable column, so existing rows are untouched (NULL). The unique constraint
is per user; Postgres treats NULLs as distinct, so any number of rows without
a key are allowed.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f6a7b8c9d0e1'
down_revision: Union[str, Sequence[str], None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('applications', sa.Column('idempotency_key', sa.String(length=64), nullable=True))
    op.create_unique_constraint(
        'uq_applications_user_idempotency_key',
        'applications',
        ['user_id', 'idempotency_key'],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('uq_applications_user_idempotency_key', 'applications', type_='unique')
    op.drop_column('applications', 'idempotency_key')
