from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class PlatformConnectionRecord(Base):
    __tablename__ = "platform_connections"

    platform: Mapped[str] = mapped_column(String(32), primary_key=True)
    connected: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    account_label: Mapped[str | None] = mapped_column(String(255), nullable=True)
    account_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    shop_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    shop_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    token_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_connected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    authorize_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    pending_state: Mapped[str | None] = mapped_column(String(255), nullable=True)
    access_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    refresh_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    capabilities: Mapped[str | None] = mapped_column(Text, nullable=True)


class StoreRecord(Base):
    __tablename__ = "stores"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    platform: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    external_shop_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    site: Mapped[str | None] = mapped_column(String(64), nullable=True)
    timezone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))


class StoreAuthorizationRecord(Base):
    __tablename__ = "store_authorizations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    store_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    platform: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    connected: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    account_label: Mapped[str | None] = mapped_column(String(255), nullable=True)
    account_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    shop_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    shop_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    token_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_connected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    authorize_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    pending_state: Mapped[str | None] = mapped_column(String(255), nullable=True)
    pending_state_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    access_token_plaintext: Mapped[str | None] = mapped_column(Text, nullable=True)
    refresh_token_plaintext: Mapped[str | None] = mapped_column(Text, nullable=True)
    capabilities: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )


class StoreHealthStatusRecord(Base):
    __tablename__ = "store_health_status"

    store_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    platform: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    auth_status: Mapped[str] = mapped_column(String(32), nullable=False, default="disconnected")
    publish_status: Mapped[str] = mapped_column(String(32), nullable=False, default="ready")
    incident_status: Mapped[str] = mapped_column(String(32), nullable=False, default="clear")
    overall_status: Mapped[str] = mapped_column(String(32), nullable=False, default="warning")
    auth_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_checked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )


class DecisionAuditLogRecord(Base):
    __tablename__ = "decision_audit_logs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    store_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    entity_type: Mapped[str] = mapped_column(String(64), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    actor_type: Mapped[str] = mapped_column(String(32), nullable=False)
    actor_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC))


class IncidentRecord(Base):
    __tablename__ = "incidents"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    store_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    platform: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    severity: Mapped[str] = mapped_column(String(16), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class CandidateRecord(Base):
    __tablename__ = "candidates"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    supplier_name: Mapped[str] = mapped_column(String(255), nullable=False)
    title_raw: Mapped[str] = mapped_column(Text, nullable=False)
    risk_level: Mapped[int] = mapped_column(Integer, nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(64), nullable=False)


class DraftRecord(Base):
    __tablename__ = "drafts"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    candidate_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(64), nullable=False)
    draft_version: Mapped[int] = mapped_column(Integer, nullable=False)
    review_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


# ============================================================================
# Sprint 2: Core Business Models
# ============================================================================


class OpportunityBatchRecord(Base):
    """候选批次 - 承载一批机会商品的执行流程"""
    __tablename__ = "opportunity_batches"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    store_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    trigger_type: Mapped[str] = mapped_column(String(32), nullable=False)  # manual, scheduled, signal
    trigger_payload: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    # Status: draft → queued → running → paused/blocked → completed/completed_with_issues/failed/archived


class OpportunityItemRecord(Base):
    """机会商品体 - 系统核心实体，承载从机会发现到发布的完整信息"""
    __tablename__ = "opportunity_items"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    batch_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    store_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(64), nullable=False, default="discovered")
    risk_level: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    score_total: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    current_supply_candidate_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    current_mapping_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    current_content_variant_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    current_pricing_decision_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    preflight_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    publish_idempotency_key: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    # Status: discovered → shortlisted → sourcing_scored → mapping_in_progress → mapping_confirmed
    # → content_generating → pricing_ready → review_passed → preflight_passed
    # → publish_queued → publishing → published/blocked/rejected/manual_required/procurement_draft_ready/archived


class DemandSignalSnapshotRecord(Base):
    """需求信号快照 - Shopee 需求侧证据"""
    __tablename__ = "demand_signal_snapshots"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    opportunity_item_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    signal_type: Mapped[str] = mapped_column(String(32), nullable=False)  # hot_keyword, trending, competitor, review_pain
    source: Mapped[str] = mapped_column(String(64), nullable=False)
    payload: Mapped[str] = mapped_column(Text, nullable=False)  # JSON
    snapshot_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class SupplyCandidateRecord(Base):
    """供货候选 - 1688 供给侧证据"""
    __tablename__ = "supply_candidates"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    opportunity_item_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    source_platform: Mapped[str] = mapped_column(String(32), nullable=False)  # 1688
    source_item_ref: Mapped[str] = mapped_column(String(255), nullable=False)
    supplier_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cost_amount: Mapped[float] = mapped_column(Float, nullable=False)
    moq: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    ship_from: Mapped[str | None] = mapped_column(String(128), nullable=True)
    reliability_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    image_quality_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC))


class CategoryMappingRecord(Base):
    """类目属性映射 - Shopee 类目与属性结构"""
    __tablename__ = "category_mappings"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    opportunity_item_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    category_ref: Mapped[str] = mapped_column(String(64), nullable=False)  # Shopee category ID
    attributes_payload: Mapped[str] = mapped_column(Text, nullable=False)  # JSON
    variation_payload: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    evidence_payload: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="proposed")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC))

    # Status: proposed → confirmed → rejected


class ContentVariantRecord(Base):
    """内容改造版本 - 标题、卖点、图片"""
    __tablename__ = "content_variants"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    opportunity_item_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    bullet_points: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON array
    image_bundle_ref: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON with image URLs
    template_ref: Mapped[str | None] = mapped_column(String(64), nullable=True)
    locale: Mapped[str] = mapped_column(String(16), nullable=False, default="vi")  # Vietnamese
    version_no: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC))

    # Status: draft → approved → rejected


class PricingDecisionRecord(Base):
    """定价决策 - 成本、费率、售价"""
    __tablename__ = "pricing_decisions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    opportunity_item_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    cost_payload: Mapped[str] = mapped_column(Text, nullable=False)  # JSON
    fee_payload: Mapped[str] = mapped_column(Text, nullable=False)  # JSON
    exchange_rate_payload: Mapped[str] = mapped_column(Text, nullable=False)  # JSON
    competitor_band_payload: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON
    suggested_price: Mapped[float] = mapped_column(Float, nullable=False)
    final_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    min_profit_line: Mapped[float] = mapped_column(Float, nullable=False)
    decision_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="proposed")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC))

    # Status: proposed → approved → rejected → invalidated


class PreflightCheckRecord(Base):
    """预飞检查 - 发布前的最终门控"""
    __tablename__ = "preflight_checks"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    opportunity_item_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    profit_check: Mapped[str] = mapped_column(String(16), nullable=False)  # passed, failed, warning
    compliance_check: Mapped[str] = mapped_column(String(16), nullable=False)
    supply_check: Mapped[str] = mapped_column(String(16), nullable=False)
    account_health_check: Mapped[str] = mapped_column(String(16), nullable=False)
    overall_result: Mapped[str] = mapped_column(String(16), nullable=False)  # passed, failed
    detail_payload: Mapped[str] = mapped_column(Text, nullable=False)  # JSON with details
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC))


class PublishTaskRecord(Base):
    """发布任务 - Shopee 商品发布"""
    __tablename__ = "publish_tasks"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    opportunity_item_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    store_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    channel: Mapped[str] = mapped_column(String(32), nullable=False, default="api")  # api, manual
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    request_payload: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON
    response_payload: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    # Status: pending → ready → queued → running → succeeded/failed_retryable/failed_terminal/blocked/cancelled


class PublishResultRecord(Base):
    """发布结果 - 发布后的结果记录"""
    __tablename__ = "publish_results"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    publish_task_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    platform_item_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)  # Shopee item ID
    result_type: Mapped[str] = mapped_column(String(32), nullable=False)  # success, failure, warning
    detail_payload: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC))


class ProcurementDraftRecord(Base):
    """采购草稿 - 待确认采购单"""
    __tablename__ = "procurement_drafts"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    opportunity_item_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    supplier_ref: Mapped[str] = mapped_column(String(255), nullable=False)
    sku_payload: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON
    qty: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    purchase_price: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    invalid_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    # Status: draft → awaiting_confirmation → confirmed → invalidated/cancelled/archived


class AgentRunRecord(Base):
    """Agent 执行记录 - AI Agent 运行追踪"""
    __tablename__ = "agent_runs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    agent_name: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    model_name: Mapped[str | None] = mapped_column(String(64), nullable=True)
    entity_type: Mapped[str] = mapped_column(String(64), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    input_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    output_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_payload: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON
    cost_payload: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="running")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC))
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class FeedbackRecordRecord(Base):
    """人工修正记录 - 回流学习"""
    __tablename__ = "feedback_records"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    opportunity_item_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    feedback_type: Mapped[str] = mapped_column(String(32), nullable=False)  # content_fix, mapping_fix, pricing_fix
    source_type: Mapped[str] = mapped_column(String(32), nullable=False)  # operator, reviewer, admin
    reviewer_ref: Mapped[str | None] = mapped_column(String(64), nullable=True)
    before_payload: Mapped[str] = mapped_column(Text, nullable=False)  # JSON
    after_payload: Mapped[str] = mapped_column(Text, nullable=False)  # JSON
    review_status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC))

    # Status: pending → approved → rejected


class TrainingArchivePackageRecord(Base):
    """训练归档包 - AI 训练数据"""
    __tablename__ = "training_archive_packages"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    store_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    batch_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    package_type: Mapped[str] = mapped_column(String(32), nullable=False)  # batch, store, manual
    storage_uri: Mapped[str] = mapped_column(Text, nullable=False)
    manifest_payload: Mapped[str] = mapped_column(Text, nullable=False)  # JSON
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC))


class SystemConfigRecord(Base):
    __tablename__ = "system_config"

    key: Mapped[str] = mapped_column(String(255), primary_key=True)
    value: Mapped[str] = mapped_column(Text, default="")
    encrypted: Mapped[str] = mapped_column(String(10), default="false")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))
