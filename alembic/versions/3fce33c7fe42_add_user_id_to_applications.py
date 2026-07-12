"""add user_id to applications

Revision ID: 3fce33c7fe42
Revises: ff13454be179
Create Date: 2026-07-12 15:34:01.746317

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3fce33c7fe42'
down_revision: Union[str, Sequence[str], None] = 'ff13454be179'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Existing applications/status_history rows have no owner. Per product decision,
    # they are wiped rather than backfilled to a placeholder account. Children first
    # to respect the status_history -> applications foreign key.
    op.execute("DELETE FROM status_history")
    op.execute("DELETE FROM applications")

    op.add_column('applications', sa.Column('user_id', sa.Integer(), nullable=False))
    op.create_index(op.f('ix_applications_user_id'), 'applications', ['user_id'], unique=False)
    op.create_foreign_key(
        'fk_applications_user_id_users',
        'applications', 'users',
        ['user_id'], ['id'],
        ondelete='CASCADE',
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('fk_applications_user_id_users', 'applications', type_='foreignkey')
    op.drop_index(op.f('ix_applications_user_id'), table_name='applications')
    op.drop_column('applications', 'user_id')
    # Data deleted in upgrade() is not recoverable by downgrade.
