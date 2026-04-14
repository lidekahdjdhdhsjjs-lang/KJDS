"""Sprint 3: 指纹浏览器池数据模型迁移"""
from alembic import op
import sqlalchemy as sa


revision = "0004_sprint3_browser_pool"
down_revision = "0003_sprint2_core_models"
branch_labels = None
depends_on = None


def upgrade():
    # 浏览器配置文件表
    op.create_table(
        "browser_profiles",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("store_id", sa.String(64), sa.ForeignKey("stores.id"), nullable=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("region", sa.String(50), nullable=False),
        sa.Column("platform", sa.String(32), nullable=False, server_default="chromium"),

        # 指纹配置
        sa.Column("user_agent", sa.String(500), nullable=False),
        sa.Column("viewport_width", sa.Integer, nullable=False, server_default="1920"),
        sa.Column("viewport_height", sa.Integer, nullable=False, server_default="1080"),
        sa.Column("timezone", sa.String(50), nullable=False),
        sa.Column("language", sa.String(20), nullable=False),
        sa.Column("locale", sa.String(10), nullable=False),

        # 硬件指纹
        sa.Column("platform_os", sa.String(50), nullable=False, server_default="Win32"),
        sa.Column("cpu_cores", sa.Integer, nullable=False, server_default="8"),
        sa.Column("memory_gb", sa.Integer, nullable=False, server_default="8"),
        sa.Column("webgl_vendor", sa.String(100), nullable=False),
        sa.Column("webgl_renderer", sa.String(200), nullable=False),
        sa.Column("canvas_noise_seed", sa.Integer, nullable=False, server_default="0"),
        sa.Column("audio_noise_seed", sa.Integer, nullable=False, server_default="0"),

        # 网络指纹
        sa.Column("do_not_track", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("webrtc_policy", sa.String(32), nullable=False, server_default="default"),

        # 代理配置
        sa.Column("proxy_host", sa.String(100), nullable=True),
        sa.Column("proxy_port", sa.Integer, nullable=True),
        sa.Column("proxy_username", sa.String(100), nullable=True),
        sa.Column("proxy_password", sa.String(100), nullable=True),
        sa.Column("proxy_type", sa.String(20), nullable=False, server_default="http"),

        # 状态
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("is_locked", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("total_uses", sa.Integer, nullable=False, server_default="0"),

        # 元数据
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("tags", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_index("ix_browser_profiles_store_id", "browser_profiles", ["store_id"])
    op.create_index("ix_browser_profiles_region", "browser_profiles", ["region"])

    # 浏览器会话表
    op.create_table(
        "browser_sessions",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("profile_id", sa.String(64), sa.ForeignKey("browser_profiles.id"), nullable=False),
        sa.Column("task_type", sa.String(32), nullable=False),
        sa.Column("task_id", sa.String(64), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="created"),
        sa.Column("pages_visited", sa.Integer, nullable=False, server_default="0"),
        sa.Column("bytes_transferred", sa.Integer, nullable=False, server_default="0"),
        sa.Column("error_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_seconds", sa.Integer, nullable=True),
        sa.Column("last_error", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_index("ix_browser_sessions_profile_id", "browser_sessions", ["profile_id"])

    # 代理池表
    op.create_table(
        "proxy_pool",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("host", sa.String(100), nullable=False),
        sa.Column("port", sa.Integer, nullable=False),
        sa.Column("proxy_type", sa.String(20), nullable=False),
        sa.Column("username", sa.String(100), nullable=True),
        sa.Column("password", sa.String(100), nullable=True),
        sa.Column("country", sa.String(10), nullable=False),
        sa.Column("region", sa.String(50), nullable=True),
        sa.Column("city", sa.String(50), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("last_checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("health_score", sa.Float, nullable=False, server_default="1.0"),
        sa.Column("success_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("failure_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("avg_response_time_ms", sa.Integer, nullable=False, server_default="0"),
        sa.Column("provider", sa.String(50), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_index("ix_proxy_pool_country", "proxy_pool", ["country"])


def downgrade():
    op.drop_index("ix_proxy_pool_country", "proxy_pool")
    op.drop_table("proxy_pool")

    op.drop_index("ix_browser_sessions_profile_id", "browser_sessions")
    op.drop_table("browser_sessions")

    op.drop_index("ix_browser_profiles_region", "browser_profiles")
    op.drop_index("ix_browser_profiles_store_id", "browser_profiles")
    op.drop_table("browser_profiles")
