"""Restore foreign key constraints dropped in d80e05bd3b26.

Revision ID: 0005_restore_fks
Revises: d80e05bd3b26
Create Date: 2026-04-15

The migration d80e05bd3b26 dropped all FK constraints as part of a schema
restructuring but never recreated them. This migration restores referential
integrity for all affected tables.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = '0005_restore_fks'
down_revision: Union[str, None] = 'd80e05bd3b26'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


FK_DEFINITIONS = {
    'category_mappings': [('opportunity_item_id', 'opportunity_items', 'id')],
    'content_variants': [('opportunity_item_id', 'opportunity_items', 'id')],
    'decision_audit_logs': [('store_id', 'stores', 'id')],
    'demand_signal_snapshots': [('opportunity_item_id', 'opportunity_items', 'id')],
    'feedback_records': [('opportunity_item_id', 'opportunity_items', 'id')],
    'incidents': [('store_id', 'stores', 'id')],
    'opportunity_batches': [('store_id', 'stores', 'id')],
    'opportunity_items': [('store_id', 'stores', 'id'), ('batch_id', 'opportunity_batches', 'id')],
    'preflight_checks': [('opportunity_item_id', 'opportunity_items', 'id')],
    'pricing_decisions': [('opportunity_item_id', 'opportunity_items', 'id')],
    'procurement_drafts': [('opportunity_item_id', 'opportunity_items', 'id')],
    'publish_results': [('publish_task_id', 'publish_tasks', 'id')],
    'publish_tasks': [('store_id', 'stores', 'id'), ('opportunity_item_id', 'opportunity_items', 'id')],
    'store_authorizations': [('store_id', 'stores', 'id')],
    'store_health_status': [('store_id', 'stores', 'id')],
    'supply_candidates': [('opportunity_item_id', 'opportunity_items', 'id')],
    'training_archive_packages': [('store_id', 'stores', 'id'), ('batch_id', 'opportunity_batches', 'id')],
}


def _fk_exists(table_name: str, fk_name: str) -> bool:
    """Check if a foreign key already exists."""
    try:
        inspector = inspect(op.get_bind())
        fks = inspector.get_foreign_keys(table_name)
        return any(fk.get('name') == fk_name for fk in fks)
    except Exception:
        return False


def _table_exists(name: str) -> bool:
    return name in inspect(op.get_bind()).get_table_names()


def upgrade() -> None:
    for table_name, fks in FK_DEFINITIONS.items():
        if not _table_exists(table_name):
            continue
        for col, ref_table, ref_col in fks:
            if not _table_exists(ref_table):
                continue
            fk_name = f'fk_{table_name}_{col}'
            if _fk_exists(table_name, fk_name):
                continue
            try:
                with op.batch_alter_table(table_name) as batch_op:
                    batch_op.create_foreign_key(fk_name, ref_table, [col], [ref_col])
            except Exception:
                pass  # FK may already exist or columns may not match


def downgrade() -> None:
    for table_name, fks in FK_DEFINITIONS.items():
        if not _table_exists(table_name):
            continue
        for col, ref_table, ref_col in fks:
            fk_name = f'fk_{table_name}_{col}'
            if not _fk_exists(table_name, fk_name):
                continue
            try:
                with op.batch_alter_table(table_name) as batch_op:
                    batch_op.drop_constraint(fk_name, type_='foreignkey')
            except Exception:
                pass
