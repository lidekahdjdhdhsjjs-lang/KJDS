"""Sprint 2 core business models.

Revision ID: 0003_sprint2_core_models
Revises: 0002_sprint1_auth_foundation
Create Date: 2026-04-10
"""

from alembic import op
import sqlalchemy as sa


revision = "0003_sprint2_core_models"
down_revision = "0002_sprint1_auth_foundation"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # opportunity_batches
    op.create_table(
        "opportunity_batches",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("store_id", sa.String(length=64), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("trigger_type", sa.String(length=32), nullable=False),
        sa.Column("trigger_payload", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column("priority", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_opportunity_batches_store_id", "opportunity_batches", ["store_id"])
    op.create_index("ix_opportunity_batches_status", "opportunity_batches", ["status"])

    # opportunity_items
    op.create_table(
        "opportunity_items",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("batch_id", sa.String(length=64), sa.ForeignKey("opportunity_batches.id"), nullable=False),
        sa.Column("store_id", sa.String(length=64), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("status", sa.String(length=64), nullable=False, server_default="discovered"),
        sa.Column("risk_level", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("score_total", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("current_supply_candidate_id", sa.String(length=64), nullable=True),
        sa.Column("current_mapping_id", sa.String(length=64), nullable=True),
        sa.Column("current_content_variant_id", sa.String(length=64), nullable=True),
        sa.Column("current_pricing_decision_id", sa.String(length=64), nullable=True),
        sa.Column("preflight_status", sa.String(length=32), nullable=True),
        sa.Column("publish_idempotency_key", sa.String(length=128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_opportunity_items_batch_id", "opportunity_items", ["batch_id"])
    op.create_index("ix_opportunity_items_store_id", "opportunity_items", ["store_id"])
    op.create_index("ix_opportunity_items_status", "opportunity_items", ["status"])

    # demand_signal_snapshots
    op.create_table(
        "demand_signal_snapshots",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("opportunity_item_id", sa.String(length=64), sa.ForeignKey("opportunity_items.id"), nullable=False),
        sa.Column("signal_type", sa.String(length=32), nullable=False),
        sa.Column("source", sa.String(length=64), nullable=False),
        sa.Column("payload", sa.Text(), nullable=False),
        sa.Column("snapshot_time", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_demand_signal_snapshots_opportunity_item_id", "demand_signal_snapshots", ["opportunity_item_id"])

    # supply_candidates
    op.create_table(
        "supply_candidates",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("opportunity_item_id", sa.String(length=64), sa.ForeignKey("opportunity_items.id"), nullable=False),
        sa.Column("source_platform", sa.String(length=32), nullable=False),
        sa.Column("source_item_ref", sa.String(length=255), nullable=False),
        sa.Column("supplier_ref", sa.String(length=255), nullable=True),
        sa.Column("cost_amount", sa.Float(), nullable=False),
        sa.Column("moq", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("ship_from", sa.String(length=128), nullable=True),
        sa.Column("reliability_score", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("image_quality_score", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_supply_candidates_opportunity_item_id", "supply_candidates", ["opportunity_item_id"])

    # category_mappings
    op.create_table(
        "category_mappings",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("opportunity_item_id", sa.String(length=64), sa.ForeignKey("opportunity_items.id"), nullable=False),
        sa.Column("category_ref", sa.String(length=64), nullable=False),
        sa.Column("attributes_payload", sa.Text(), nullable=False),
        sa.Column("variation_payload", sa.Text(), nullable=True),
        sa.Column("confidence_score", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("evidence_payload", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="proposed"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_category_mappings_opportunity_item_id", "category_mappings", ["opportunity_item_id"])

    # content_variants
    op.create_table(
        "content_variants",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("opportunity_item_id", sa.String(length=64), sa.ForeignKey("opportunity_items.id"), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("bullet_points", sa.Text(), nullable=True),
        sa.Column("image_bundle_ref", sa.Text(), nullable=True),
        sa.Column("template_ref", sa.String(length=64), nullable=True),
        sa.Column("locale", sa.String(length=16), nullable=False, server_default="vi"),
        sa.Column("version_no", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_content_variants_opportunity_item_id", "content_variants", ["opportunity_item_id"])

    # pricing_decisions
    op.create_table(
        "pricing_decisions",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("opportunity_item_id", sa.String(length=64), sa.ForeignKey("opportunity_items.id"), nullable=False),
        sa.Column("cost_payload", sa.Text(), nullable=False),
        sa.Column("fee_payload", sa.Text(), nullable=False),
        sa.Column("exchange_rate_payload", sa.Text(), nullable=False),
        sa.Column("competitor_band_payload", sa.Text(), nullable=True),
        sa.Column("suggested_price", sa.Float(), nullable=False),
        sa.Column("final_price", sa.Float(), nullable=True),
        sa.Column("min_profit_line", sa.Float(), nullable=False),
        sa.Column("decision_reason", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="proposed"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_pricing_decisions_opportunity_item_id", "pricing_decisions", ["opportunity_item_id"])

    # preflight_checks
    op.create_table(
        "preflight_checks",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("opportunity_item_id", sa.String(length=64), sa.ForeignKey("opportunity_items.id"), nullable=False),
        sa.Column("profit_check", sa.String(length=16), nullable=False),
        sa.Column("compliance_check", sa.String(length=16), nullable=False),
        sa.Column("supply_check", sa.String(length=16), nullable=False),
        sa.Column("account_health_check", sa.String(length=16), nullable=False),
        sa.Column("overall_result", sa.String(length=16), nullable=False),
        sa.Column("detail_payload", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_preflight_checks_opportunity_item_id", "preflight_checks", ["opportunity_item_id"])

    # publish_tasks
    op.create_table(
        "publish_tasks",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("opportunity_item_id", sa.String(length=64), sa.ForeignKey("opportunity_items.id"), nullable=False),
        sa.Column("store_id", sa.String(length=64), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("channel", sa.String(length=32), nullable=False, server_default="api"),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False, unique=True),
        sa.Column("request_payload", sa.Text(), nullable=True),
        sa.Column("response_payload", sa.Text(), nullable=True),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_publish_tasks_opportunity_item_id", "publish_tasks", ["opportunity_item_id"])
    op.create_index("ix_publish_tasks_store_id", "publish_tasks", ["store_id"])
    op.create_index("ix_publish_tasks_status", "publish_tasks", ["status"])

    # publish_results
    op.create_table(
        "publish_results",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("publish_task_id", sa.String(length=64), sa.ForeignKey("publish_tasks.id"), nullable=False),
        sa.Column("platform_item_ref", sa.String(length=255), nullable=True),
        sa.Column("result_type", sa.String(length=32), nullable=False),
        sa.Column("detail_payload", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_publish_results_publish_task_id", "publish_results", ["publish_task_id"])

    # procurement_drafts
    op.create_table(
        "procurement_drafts",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("opportunity_item_id", sa.String(length=64), sa.ForeignKey("opportunity_items.id"), nullable=False),
        sa.Column("supplier_ref", sa.String(length=255), nullable=False),
        sa.Column("sku_payload", sa.Text(), nullable=True),
        sa.Column("qty", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("purchase_price", sa.Float(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column("invalid_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_procurement_drafts_opportunity_item_id", "procurement_drafts", ["opportunity_item_id"])

    # agent_runs
    op.create_table(
        "agent_runs",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("agent_name", sa.String(length=64), nullable=False),
        sa.Column("model_name", sa.String(length=64), nullable=True),
        sa.Column("entity_type", sa.String(length=64), nullable=False),
        sa.Column("entity_id", sa.String(length=64), nullable=False),
        sa.Column("input_summary", sa.Text(), nullable=True),
        sa.Column("output_summary", sa.Text(), nullable=True),
        sa.Column("evidence_payload", sa.Text(), nullable=True),
        sa.Column("cost_payload", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="running"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_agent_runs_agent_name", "agent_runs", ["agent_name"])
    op.create_index("ix_agent_runs_entity_id", "agent_runs", ["entity_id"])

    # feedback_records
    op.create_table(
        "feedback_records",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("opportunity_item_id", sa.String(length=64), sa.ForeignKey("opportunity_items.id"), nullable=False),
        sa.Column("feedback_type", sa.String(length=32), nullable=False),
        sa.Column("source_type", sa.String(length=32), nullable=False),
        sa.Column("reviewer_ref", sa.String(length=64), nullable=True),
        sa.Column("before_payload", sa.Text(), nullable=False),
        sa.Column("after_payload", sa.Text(), nullable=False),
        sa.Column("review_status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_feedback_records_opportunity_item_id", "feedback_records", ["opportunity_item_id"])

    # training_archive_packages
    op.create_table(
        "training_archive_packages",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("store_id", sa.String(length=64), sa.ForeignKey("stores.id"), nullable=True),
        sa.Column("batch_id", sa.String(length=64), sa.ForeignKey("opportunity_batches.id"), nullable=True),
        sa.Column("package_type", sa.String(length=32), nullable=False),
        sa.Column("storage_uri", sa.Text(), nullable=False),
        sa.Column("manifest_payload", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_training_archive_packages_store_id", "training_archive_packages", ["store_id"])
    op.create_index("ix_training_archive_packages_batch_id", "training_archive_packages", ["batch_id"])


def downgrade() -> None:
    op.drop_index("ix_training_archive_packages_batch_id", table_name="training_archive_packages")
    op.drop_index("ix_training_archive_packages_store_id", table_name="training_archive_packages")
    op.drop_table("training_archive_packages")

    op.drop_index("ix_feedback_records_opportunity_item_id", table_name="feedback_records")
    op.drop_table("feedback_records")

    op.drop_index("ix_agent_runs_entity_id", table_name="agent_runs")
    op.drop_index("ix_agent_runs_agent_name", table_name="agent_runs")
    op.drop_table("agent_runs")

    op.drop_index("ix_procurement_drafts_opportunity_item_id", table_name="procurement_drafts")
    op.drop_table("procurement_drafts")

    op.drop_index("ix_publish_results_publish_task_id", table_name="publish_results")
    op.drop_table("publish_results")

    op.drop_index("ix_publish_tasks_status", table_name="publish_tasks")
    op.drop_index("ix_publish_tasks_store_id", table_name="publish_tasks")
    op.drop_index("ix_publish_tasks_opportunity_item_id", table_name="publish_tasks")
    op.drop_table("publish_tasks")

    op.drop_index("ix_preflight_checks_opportunity_item_id", table_name="preflight_checks")
    op.drop_table("preflight_checks")

    op.drop_index("ix_pricing_decisions_opportunity_item_id", table_name="pricing_decisions")
    op.drop_table("pricing_decisions")

    op.drop_index("ix_content_variants_opportunity_item_id", table_name="content_variants")
    op.drop_table("content_variants")

    op.drop_index("ix_category_mappings_opportunity_item_id", table_name="category_mappings")
    op.drop_table("category_mappings")

    op.drop_index("ix_supply_candidates_opportunity_item_id", table_name="supply_candidates")
    op.drop_table("supply_candidates")

    op.drop_index("ix_demand_signal_snapshots_opportunity_item_id", table_name="demand_signal_snapshots")
    op.drop_table("demand_signal_snapshots")

    op.drop_index("ix_opportunity_items_status", table_name="opportunity_items")
    op.drop_index("ix_opportunity_items_store_id", table_name="opportunity_items")
    op.drop_index("ix_opportunity_items_batch_id", table_name="opportunity_items")
    op.drop_table("opportunity_items")

    op.drop_index("ix_opportunity_batches_status", table_name="opportunity_batches")
    op.drop_index("ix_opportunity_batches_store_id", table_name="opportunity_batches")
    op.drop_table("opportunity_batches")
