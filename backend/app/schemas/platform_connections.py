from typing import Literal

from pydantic import BaseModel

from app.schemas.dashboard import PlatformAuthorizationStatus

PlatformName = Literal["shopee", "1688"]
PlatformConnectionState = Literal["disconnected", "pending", "connected", "error"]
PlatformCapability = Literal["read_products", "read_shop", "publish_listings"]


class PlatformConnectionStatus(BaseModel):
    platform: PlatformName
    connected: bool
    status: PlatformConnectionState
    account_label: str | None = None
    account_id: str | None = None
    shop_id: str | None = None
    shop_name: str | None = None
    token_expires_at: str | None = None
    last_connected_at: str | None = None
    last_error: str | None = None
    authorize_url: str | None = None
    capabilities: list[PlatformCapability] = []


class PlatformConnectionsSummary(BaseModel):
    items: list[PlatformConnectionStatus]
    authorization: PlatformAuthorizationStatus


class PlatformAuthorizationStartResponse(BaseModel):
    platform: PlatformName
    status: Literal["pending"]
    authorize_url: str
    pending_state: str


class StoreView(BaseModel):
    id: str
    platform: PlatformName
    external_shop_id: str | None = None
    name: str
    site: str | None = None
    timezone: str | None = None
    status: str
    created_at: str
    updated_at: str


class StoreAuthorizationView(BaseModel):
    id: str
    store_id: str
    platform: PlatformName
    provider: str
    connected: bool
    status: str
    account_label: str | None = None
    account_id: str | None = None
    shop_id: str | None = None
    shop_name: str | None = None
    token_expires_at: str | None = None
    last_connected_at: str | None = None
    last_error: str | None = None
    authorize_url: str | None = None
    capabilities: list[PlatformCapability] = []
    updated_at: str


class StoreHealthStatusView(BaseModel):
    store_id: str
    platform: PlatformName
    auth_status: str
    publish_status: str
    incident_status: str
    overall_status: str
    auth_message: str | None = None
    last_checked_at: str
    updated_at: str


class StoreListResponse(BaseModel):
    items: list[StoreView]


class StoreAuthorizationsResponse(BaseModel):
    items: list[StoreAuthorizationView]


class StoreHealthResponse(BaseModel):
    item: StoreHealthStatusView
