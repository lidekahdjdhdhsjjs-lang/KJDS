"""浏览器配置文件模型 - 指纹浏览器池核心实体"""
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class BrowserProfileRecord(Base):
    """浏览器配置文件 - 独立的浏览器身份"""
    __tablename__ = "browser_profiles"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    store_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)

    # 基本信息
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    region: Mapped[str] = mapped_column(String(50), nullable=False)  # SG, MY, TH, PH, VN, ID
    platform: Mapped[str] = mapped_column(String(32), nullable=False, default="chromium")

    # 指纹配置
    user_agent: Mapped[str] = mapped_column(String(500), nullable=False)
    viewport_width: Mapped[int] = mapped_column(Integer, nullable=False, default=1920)
    viewport_height: Mapped[int] = mapped_column(Integer, nullable=False, default=1080)
    timezone: Mapped[str] = mapped_column(String(50), nullable=False, default="Asia/Singapore")
    language: Mapped[str] = mapped_column(String(20), nullable=False, default="en-SG")
    locale: Mapped[str] = mapped_column(String(10), nullable=False, default="en_SG")

    # 硬件指纹
    platform_os: Mapped[str] = mapped_column(String(50), nullable=False, default="Win32")
    cpu_cores: Mapped[int] = mapped_column(Integer, nullable=False, default=8)
    memory_gb: Mapped[int] = mapped_column(Integer, nullable=False, default=8)
    webgl_vendor: Mapped[str] = mapped_column(String(100), nullable=False)
    webgl_renderer: Mapped[str] = mapped_column(String(200), nullable=False)
    canvas_noise_seed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    audio_noise_seed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # 网络指纹
    do_not_track: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    webrtc_policy: Mapped[str] = mapped_column(String(32), nullable=False, default="default")

    # 代理配置
    proxy_host: Mapped[str | None] = mapped_column(String(100), nullable=True)
    proxy_port: Mapped[int | None] = mapped_column(Integer, nullable=True)
    proxy_username: Mapped[str | None] = mapped_column(String(100), nullable=True)
    proxy_password: Mapped[str | None] = mapped_column(String(100), nullable=True)
    proxy_type: Mapped[str] = mapped_column(String(20), nullable=False, default="http")  # http, socks5

    # 状态
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_locked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    total_uses: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # 元数据
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON array

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )


class BrowserSessionRecord(Base):
    """浏览器会话记录 - 追踪每次使用"""
    __tablename__ = "browser_sessions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    profile_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)

    # 会话信息
    task_type: Mapped[str] = mapped_column(String(32), nullable=False)  # scrape, monitor, verify
    task_id: Mapped[str | None] = mapped_column(String(64), nullable=True)  # 关联的任务ID

    # 状态
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="created")
    # created, running, idle, closed, error

    # 使用统计
    pages_visited: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    bytes_transferred: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # 时间
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # 错误信息
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )


class ProxyPoolRecord(Base):
    """代理池 - IP代理管理"""
    __tablename__ = "proxy_pool"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)

    # 代理信息
    host: Mapped[str] = mapped_column(String(100), nullable=False)
    port: Mapped[int] = mapped_column(Integer, nullable=False)
    proxy_type: Mapped[str] = mapped_column(String(20), nullable=False)  # http, socks5
    username: Mapped[str | None] = mapped_column(String(100), nullable=True)
    password: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # 地理信息
    country: Mapped[str] = mapped_column(String(10), nullable=False)
    region: Mapped[str | None] = mapped_column(String(50), nullable=True)
    city: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # 状态
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    health_score: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    success_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    failure_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    avg_response_time_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # 提供商信息
    provider: Mapped[str | None] = mapped_column(String(50), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )
