"""浏览器自动化 API 路由"""
import json
import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db import get_db_session
from app.models_browser import BrowserProfileRecord, BrowserSessionRecord, ProxyPoolRecord
from app.repositories.browser_profiles import (
    BrowserProfileRepository,
    BrowserSessionRepository,
    ProxyPoolRepository,
)
from app.services.browser_automation import (
    browser_automation_service,
    BrowserSession,
    REGION_CONFIGS,
)

router = APIRouter(prefix="/browser", tags=["Browser Automation"])


# ============================================================================
# Request/Response Schemas
# ============================================================================

class BrowserProfileCreate(BaseModel):
    """创建浏览器配置请求"""
    name: str = Field(..., min_length=1, max_length=100)
    region: str = Field(..., pattern="^(SG|MY|TH|PH|VN|ID)$")
    store_id: str | None = None
    proxy_host: str | None = None
    proxy_port: int | None = None
    proxy_username: str | None = None
    proxy_password: str | None = None
    proxy_type: str = Field(default="http", pattern="^(http|socks5)$")
    viewport_width: int = Field(default=1920, ge=800, le=3840)
    viewport_height: int = Field(default=1080, ge=600, le=2160)
    tags: list[str] = Field(default_factory=list)


class BrowserProfileResponse(BaseModel):
    """浏览器配置响应"""
    id: str
    name: str
    region: str
    store_id: str | None
    user_agent: str
    viewport_width: int
    viewport_height: int
    timezone: str
    language: str
    webgl_vendor: str
    webgl_renderer: str
    proxy_host: str | None
    proxy_port: int | None
    proxy_type: str
    is_active: bool
    is_locked: bool
    last_used_at: datetime | None
    total_uses: int
    created_at: datetime


class BrowserSessionCreate(BaseModel):
    """创建浏览器会话请求"""
    profile_id: str
    task_type: str = Field(default="scrape", pattern="^(scrape|monitor|verify)$")
    task_id: str | None = None
    headless: bool = True


class ScrapeRequest(BaseModel):
    """抓取请求"""
    url: str
    wait_for: str | None = None
    timeout: int = Field(default=30000, ge=5000, le=120000)


class ProxyCreate(BaseModel):
    """创建代理请求"""
    host: str
    port: int = Field(..., ge=1, le=65535)
    proxy_type: str = Field(default="http", pattern="^(http|socks5)$")
    username: str | None = None
    password: str | None = None
    country: str
    region: str | None = None
    city: str | None = None
    provider: str | None = None
    expires_at: datetime | None = None


class ProxyResponse(BaseModel):
    """代理响应"""
    id: str
    host: str
    port: int
    proxy_type: str
    country: str
    region: str | None
    city: str | None
    is_active: bool
    health_score: float
    success_count: int
    failure_count: int
    avg_response_time_ms: int
    last_checked_at: datetime | None
    created_at: datetime


# ============================================================================
# Browser Profile Endpoints
# ============================================================================

@router.post("/profiles", response_model=BrowserProfileResponse)
async def create_browser_profile(
    request: BrowserProfileCreate,
    db: Session = Depends(get_db_session),
):
    """创建浏览器配置文件"""
    repo = BrowserProfileRepository(db)

    # 准备代理配置
    proxy_config = None
    if request.proxy_host:
        proxy_config = {
            "host": request.proxy_host,
            "port": request.proxy_port,
            "username": request.proxy_username,
            "password": request.proxy_password,
            "type": request.proxy_type,
        }

    # 创建配置
    profile = await browser_automation_service.create_profile(
        name=request.name,
        region=request.region,
        store_id=request.store_id,
        proxy_config=proxy_config,
        viewport_width=request.viewport_width,
        viewport_height=request.viewport_height,
        tags=request.tags,
    )

    # 保存到数据库
    saved_profile = repo.create(profile)

    return BrowserProfileResponse(
        id=saved_profile.id,
        name=saved_profile.name,
        region=saved_profile.region,
        store_id=saved_profile.store_id,
        user_agent=saved_profile.user_agent,
        viewport_width=saved_profile.viewport_width,
        viewport_height=saved_profile.viewport_height,
        timezone=saved_profile.timezone,
        language=saved_profile.language,
        webgl_vendor=saved_profile.webgl_vendor,
        webgl_renderer=saved_profile.webgl_renderer,
        proxy_host=saved_profile.proxy_host,
        proxy_port=saved_profile.proxy_port,
        proxy_type=saved_profile.proxy_type,
        is_active=saved_profile.is_active,
        is_locked=saved_profile.is_locked,
        last_used_at=saved_profile.last_used_at,
        total_uses=saved_profile.total_uses,
        created_at=saved_profile.created_at,
    )


@router.get("/profiles", response_model=list[BrowserProfileResponse])
async def list_browser_profiles(
    region: str | None = Query(None, pattern="^(SG|MY|TH|PH|VN|ID)$"),
    store_id: str | None = None,
    is_active: bool | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db_session),
):
    """列出浏览器配置文件"""
    repo = BrowserProfileRepository(db)

    if store_id:
        profiles = repo.get_by_store(store_id)
    else:
        profiles = repo.list_all(
            is_active=is_active,
            region=region,
            limit=limit,
            offset=offset,
        )

    return [
        BrowserProfileResponse(
            id=p.id,
            name=p.name,
            region=p.region,
            store_id=p.store_id,
            user_agent=p.user_agent,
            viewport_width=p.viewport_width,
            viewport_height=p.viewport_height,
            timezone=p.timezone,
            language=p.language,
            webgl_vendor=p.webgl_vendor,
            webgl_renderer=p.webgl_renderer,
            proxy_host=p.proxy_host,
            proxy_port=p.proxy_port,
            proxy_type=p.proxy_type,
            is_active=p.is_active,
            is_locked=p.is_locked,
            last_used_at=p.last_used_at,
            total_uses=p.total_uses,
            created_at=p.created_at,
        )
        for p in profiles
    ]


@router.get("/profiles/{profile_id}", response_model=BrowserProfileResponse)
async def get_browser_profile(
    profile_id: str,
    db: Session = Depends(get_db_session),
):
    """获取浏览器配置文件详情"""
    repo = BrowserProfileRepository(db)
    profile = repo.get_by_id(profile_id)

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    return BrowserProfileResponse(
        id=profile.id,
        name=profile.name,
        region=profile.region,
        store_id=profile.store_id,
        user_agent=profile.user_agent,
        viewport_width=profile.viewport_width,
        viewport_height=profile.viewport_height,
        timezone=profile.timezone,
        language=profile.language,
        webgl_vendor=profile.webgl_vendor,
        webgl_renderer=profile.webgl_renderer,
        proxy_host=profile.proxy_host,
        proxy_port=profile.proxy_port,
        proxy_type=profile.proxy_type,
        is_active=profile.is_active,
        is_locked=profile.is_locked,
        last_used_at=profile.last_used_at,
        total_uses=profile.total_uses,
        created_at=profile.created_at,
    )


@router.delete("/profiles/{profile_id}")
async def delete_browser_profile(
    profile_id: str,
    db: Session = Depends(get_db_session),
):
    """删除浏览器配置文件"""
    repo = BrowserProfileRepository(db)

    profile = repo.get_by_id(profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if profile.is_locked:
        raise HTTPException(status_code=400, detail="Profile is locked")

    repo.delete(profile_id)
    return {"message": "Profile deleted", "id": profile_id}


@router.post("/profiles/{profile_id}/lock")
async def lock_browser_profile(
    profile_id: str,
    db: Session = Depends(get_db_session),
):
    """锁定浏览器配置文件"""
    repo = BrowserProfileRepository(db)
    success = repo.lock(profile_id)

    if not success:
        raise HTTPException(status_code=404, detail="Profile not found")

    return {"message": "Profile locked", "id": profile_id}


@router.post("/profiles/{profile_id}/unlock")
async def unlock_browser_profile(
    profile_id: str,
    db: Session = Depends(get_db_session),
):
    """解锁浏览器配置文件"""
    repo = BrowserProfileRepository(db)
    success = repo.unlock(profile_id)

    if not success:
        raise HTTPException(status_code=404, detail="Profile not found")

    return {"message": "Profile unlocked", "id": profile_id}


# ============================================================================
# Browser Session Endpoints
# ============================================================================

@router.post("/sessions")
async def create_browser_session(
    request: BrowserSessionCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db_session),
):
    """创建浏览器会话"""
    profile_repo = BrowserProfileRepository(db)

    # 获取配置文件
    profile = profile_repo.get_by_id(request.profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if profile.is_locked:
        raise HTTPException(status_code=400, detail="Profile is locked")

    if not profile.is_active:
        raise HTTPException(status_code=400, detail="Profile is not active")

    try:
        # 创建会话
        session = await browser_automation_service.create_session(
            profile=profile,
            task_type=request.task_type,
            task_id=request.task_id,
            headless=request.headless,
        )

        # 锁定配置文件
        profile_repo.lock(profile.id)

        return {
            "session_id": session.session_id,
            "profile_id": profile.id,
            "status": "running",
            "task_type": request.task_type,
            "task_id": request.task_id,
            "started_at": session.started_at.isoformat(),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create session: {str(e)}")


@router.post("/sessions/{session_id}/close")
async def close_browser_session(
    session_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db_session),
):
    """关闭浏览器会话"""
    result = await browser_automation_service.close_session(session_id)

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    # 解锁配置文件
    profile_repo = BrowserProfileRepository(db)
    session = browser_automation_service._sessions.get(session_id)
    if session:
        background_tasks.add_task(profile_repo.unlock, session.profile.id)

    return result


@router.get("/sessions", response_model=list[str])
async def list_active_sessions():
    """列出所有活跃会话"""
    return browser_automation_service.get_active_sessions()


@router.post("/sessions/{session_id}/scrape")
async def scrape_url(
    session_id: str,
    request: ScrapeRequest,
    db: Session = Depends(get_db_session),
):
    """使用会话抓取URL"""
    session = browser_automation_service._sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    result = await browser_automation_service.scrape_url(
        session=session,
        url=request.url,
        wait_for=request.wait_for,
        timeout=request.timeout,
    )

    return result


@router.post("/sessions/{session_id}/scrape/shopee")
async def scrape_shopee_product(
    session_id: str,
    request: ScrapeRequest,
    db: Session = Depends(get_db_session),
):
    """抓取Shopee商品详情"""
    session = browser_automation_service._sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    result = await browser_automation_service.scrape_shopee_product(
        session=session,
        product_url=request.url,
    )

    return result


@router.post("/sessions/{session_id}/scrape/1688")
async def scrape_1688_product(
    session_id: str,
    request: ScrapeRequest,
    db: Session = Depends(get_db_session),
):
    """抓取1688商品详情"""
    session = browser_automation_service._sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    result = await browser_automation_service.scrape_1688_product(
        session=session,
        product_url=request.url,
    )

    return result


# ============================================================================
# Proxy Pool Endpoints
# ============================================================================

@router.post("/proxies", response_model=ProxyResponse)
async def create_proxy(
    request: ProxyCreate,
    db: Session = Depends(get_db_session),
):
    """创建代理"""
    repo = ProxyPoolRepository(db)

    proxy = ProxyPoolRecord(
        id=str(uuid.uuid4()),
        host=request.host,
        port=request.port,
        proxy_type=request.proxy_type,
        username=request.username,
        password=request.password,
        country=request.country,
        region=request.region,
        city=request.city,
        provider=request.provider,
        expires_at=request.expires_at,
        is_active=True,
        health_score=1.0,
    )

    saved_proxy = repo.create(proxy)

    return ProxyResponse(
        id=saved_proxy.id,
        host=saved_proxy.host,
        port=saved_proxy.port,
        proxy_type=saved_proxy.proxy_type,
        country=saved_proxy.country,
        region=saved_proxy.region,
        city=saved_proxy.city,
        is_active=saved_proxy.is_active,
        health_score=saved_proxy.health_score,
        success_count=saved_proxy.success_count,
        failure_count=saved_proxy.failure_count,
        avg_response_time_ms=saved_proxy.avg_response_time_ms,
        last_checked_at=saved_proxy.last_checked_at,
        created_at=saved_proxy.created_at,
    )


@router.get("/proxies", response_model=list[ProxyResponse])
async def list_proxies(
    country: str | None = None,
    is_active: bool | None = None,
    db: Session = Depends(get_db_session),
):
    """列出代理"""
    repo = ProxyPoolRepository(db)
    proxies = repo.list_all(is_active=is_active, country=country)

    return [
        ProxyResponse(
            id=p.id,
            host=p.host,
            port=p.port,
            proxy_type=p.proxy_type,
            country=p.country,
            region=p.region,
            city=p.city,
            is_active=p.is_active,
            health_score=p.health_score,
            success_count=p.success_count,
            failure_count=p.failure_count,
            avg_response_time_ms=p.avg_response_time_ms,
            last_checked_at=p.last_checked_at,
            created_at=p.created_at,
        )
        for p in proxies
    ]


@router.delete("/proxies/{proxy_id}")
async def delete_proxy(
    proxy_id: str,
    db: Session = Depends(get_db_session),
):
    """删除代理"""
    repo = ProxyPoolRepository(db)
    success = repo.delete(proxy_id)

    if not success:
        raise HTTPException(status_code=404, detail="Proxy not found")

    return {"message": "Proxy deleted", "id": proxy_id}


# ============================================================================
# Region Info Endpoint
# ============================================================================

@router.get("/regions")
async def list_regions():
    """列出支持的地区配置"""
    return REGION_CONFIGS


# ============================================================================
# Health Check
# ============================================================================

@router.get("/health")
async def browser_health_check():
    """浏览器服务健康检查"""
    active_sessions = len(browser_automation_service.get_active_sessions())

    return {
        "status": "healthy",
        "active_sessions": active_sessions,
        "supported_regions": list(REGION_CONFIGS.keys()),
    }
