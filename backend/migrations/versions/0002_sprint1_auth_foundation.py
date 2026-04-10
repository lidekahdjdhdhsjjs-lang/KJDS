"""Sprint 1 store-aware authorization foundation.

Revision ID: 0002_sprint1_auth_foundation
Revises: 0001_init
Create Date: 2026-04-10
"""

from alembic import op
import sqlalchemy as sa


revision = "0002_sprint1_auth_foundation"
down_revision = "0001_init"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "stores",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("platform", sa.String(length=32), nullable=False),
        sa.Column("external_shop_id", sa.String(length=255), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("site", sa.String(length=64), nullable=True),
        sa.Column("timezone", sa.String(length=64), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_stores_platform", "stores", ["platform"])

    op.create_table(
        "store_authorizations",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("store_id", sa.String(length=64), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("platform", sa.String(length=32), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False),
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
        sa.Column("pending_state_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("access_token_ciphertext", sa.Text(), nullable=True),
        sa.Column("refresh_token_ciphertext", sa.Text(), nullable=True),
        sa.Column("capabilities", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_store_authorizations_platform", "store_authorizations", ["platform"])
    op.create_index("ix_store_authorizations_store_id", "store_authorizations", ["store_id"])

    op.create_table(
        "store_health_status",
        sa.Column("store_id", sa.String(length=64), sa.ForeignKey("stores.id"), primary_key=True),
        sa.Column("platform", sa.String(length=32), nullable=False),
        sa.Column("auth_status", sa.String(length=32), nullable=False),
        sa.Column("publish_status", sa.String(length=32), nullable=False),
        sa.Column("incident_status", sa.String(length=32), nullable=False),
        sa.Column("overall_status", sa.String(length=32), nullable=False, server_default="warning"),
        sa.Column("auth_message", sa.Text(), nullable=True),
        sa.Column("last_checked_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "decision_audit_logs",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("store_id", sa.String(length=64), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("entity_type", sa.String(length=64), nullable=False),
        sa.Column("entity_id", sa.String(length=64), nullable=False),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("actor_type", sa.String(length=32), nullable=False),
        sa.Column("actor_id", sa.String(length=64), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_decision_audit_logs_store_id", "decision_audit_logs", ["store_id"])
    op.create_index("ix_decision_audit_logs_created_at", "decision_audit_logs", ["created_at"])

    op.create_table(
        "incidents",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("store_id", sa.String(length=64), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("platform", sa.String(length=32), nullable=False),
        sa.Column("severity", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_incidents_store_id", "incidents", ["store_id"])
    op.create_index("ix_incidents_status", "incidents", ["status"])


def downgrade() -> None:
    op.drop_index("ix_incidents_status", table_name="incidents")
    op.drop_index("ix_incidents_store_id", table_name="incidents")
    op.drop_table("incidents")

    op.drop_index("ix_decision_audit_logs_created_at", table_name="decision_audit_logs")
    op.drop_index("ix_decision_audit_logs_store_id", table_name="decision_audit_logs")
    op.drop_table("decision_audit_logs")

    op.drop_table("store_health_status")

    op.drop_index("ix_store_authorizations_store_id", table_name="store_authorizations")
    op.drop_index("ix_store_authorizations_platform", table_name="store_authorizations")
    op.drop_table("store_authorizations")

    op.drop_index("ix_stores_platform", table_name="stores")
    op.drop_table("stores")
