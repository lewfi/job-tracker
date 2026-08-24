"""add ghosted status to applications and status_history check constraints

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-08-24 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_constraint('status_check', 'applications', type_='check')
    op.create_check_constraint(
        'status_check',
        'applications',
        "status IN ('applied', 'oa', 'screen', 'technical', 'behavioral', 'onsite', 'offer', 'rejected', 'withdrawn', 'ghosted')",
    )
    op.drop_constraint('status_check', 'status_history', type_='check')
    op.create_check_constraint(
        'status_check',
        'status_history',
        "status IN ('applied', 'oa', 'screen', 'technical', 'behavioral', 'onsite', 'offer', 'rejected', 'withdrawn', 'ghosted')",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('status_check', 'applications', type_='check')
    op.create_check_constraint(
        'status_check',
        'applications',
        "status IN ('applied', 'oa', 'screen', 'technical', 'behavioral', 'onsite', 'offer', 'rejected', 'withdrawn')",
    )
    op.drop_constraint('status_check', 'status_history', type_='check')
    op.create_check_constraint(
        'status_check',
        'status_history',
        "status IN ('applied', 'oa', 'screen', 'technical', 'behavioral', 'onsite', 'offer', 'rejected', 'withdrawn')",
    )
