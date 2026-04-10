"""initial persistence foundation

Revision ID: 0001_init
Revises:
Create Date: 2026-04-10
"""

from alembic import op
import sqlalchemy as sa


revision = "0001_init"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "platform_connections",
        sa.Column("platform", sa.String(length=32), primary_key=True),
        sa.Column("connected", sa.Boolean(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("account_label", sa.String(length=255), nullable=True),
        sa.Column("account_id", sa.String(length=255), nullable=True),
        sa.Column("shop_id", sa.String(length=255), nullable=True),
        sa.Column("shop_name", sa.String(length=255), nullable=True),
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_connected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("authorize_url", sa.Text(), nullable=True),
        sa.Column("pending_state", sa.String(length=255), nullable=True),
        sa.Column("access_token", sa.Text(), nullable=True),
        sa.Column("refresh_token", sa.Text(), nullable=True),
        sa.Column("capabilities", sa.Text(), nullable=True),
    )
    op.create_table(
        "candidates",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("supplier_name", sa.String(length=255), nullable=False),
        sa.Column("title_raw", sa.Text(), nullable=False),
        sa.Column("risk_level", sa.Integer(), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("status", sa.String(length=64), nullable=False),
    )
    op.create_table(
        "drafts",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("candidate_id", sa.String(length=64), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.Column("draft_version", sa.Integer(), nullable=False),
        sa.Column("review_comment", sa.Text(), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_drafts_candidate_id", "drafts", ["candidate_id"])


def downgrade() -> None:
    op.drop_index("ix_drafts_candidate_id", table_name="drafts")
    op.drop_table("drafts")
    op.drop_table("candidates")
    op.drop_table("platform_connections")
