"""add oa status to applications and status_history check constraints

Revision ID: a1b2c3d4e5f6
Revises: 3fce33c7fe42
Create Date: 2026-07-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '3fce33c7fe42'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_constraint('status_check', 'applications', type_='check')
    op.create_check_constraint(
        'status_check',
        'applications',
        "status IN ('applied', 'oa', 'screen', 'onsite', 'offer', 'rejected', 'withdrawn')",
    )
    op.drop_constraint('status_check', 'status_history', type_='check')
    op.create_check_constraint(
        'status_check',
        'status_history',
        "status IN ('applied', 'oa', 'screen', 'onsite', 'offer', 'rejected', 'withdrawn')",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('status_check', 'applications', type_='check')
    op.create_check_constraint(
        'status_check',
        'applications',
        "status IN ('applied', 'screen', 'onsite', 'offer', 'rejected', 'withdrawn')",
    )
    op.drop_constraint('status_check', 'status_history', type_='check')
    op.create_check_constraint(
        'status_check',
        'status_history',
        "status IN ('applied', 'screen', 'onsite', 'offer', 'rejected', 'withdrawn')",
    )
