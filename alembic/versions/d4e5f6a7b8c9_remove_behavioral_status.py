"""remove behavioral status from applications and status_history

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-10-21 00:00:00.000000

Any row whose status is 'behavioral' (in applications or status_history) is
rewritten to 'technical' BEFORE the status_check constraints are recreated
without 'behavioral' — otherwise the new constraint would reject those rows
and the migration would fail. No rows are deleted.

Downgrade limitation: downgrade() re-adds 'behavioral' to both constraints,
but it cannot restore which rows were originally 'behavioral'. Those rows
stay 'technical' after a downgrade; the original values are not recorded
anywhere.
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Data first: move 'behavioral' rows to 'technical' so the narrower
    # constraint below accepts every existing row.
    op.execute("UPDATE applications SET status = 'technical' WHERE status = 'behavioral'")
    op.execute("UPDATE status_history SET status = 'technical' WHERE status = 'behavioral'")

    op.drop_constraint('status_check', 'applications', type_='check')
    op.create_check_constraint(
        'status_check',
        'applications',
        "status IN ('applied', 'oa', 'screen', 'technical', 'onsite', 'offer', 'rejected', 'withdrawn', 'ghosted')",
    )
    op.drop_constraint('status_check', 'status_history', type_='check')
    op.create_check_constraint(
        'status_check',
        'status_history',
        "status IN ('applied', 'oa', 'screen', 'technical', 'onsite', 'offer', 'rejected', 'withdrawn', 'ghosted')",
    )


def downgrade() -> None:
    """Downgrade schema. Does not restore which rows were 'behavioral' (see docstring)."""
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
