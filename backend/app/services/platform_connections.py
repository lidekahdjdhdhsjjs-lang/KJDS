from hashlib import sha256
from hmac import new as hmac_new
from secrets import token_urlsafe
from time import time

from app.connectors.alibaba1688.auth import (
    build_authorize_url as build_alibaba_authorize_url,
)
from app.connectors.shopee.auth import (
    build_authorize_url as build_shopee_authorize_url,
)
from app.core.config import settings
from app.repositories.platform_connections import (
    disconnect_platform as disconnect_platform_record,
    get_pending_state,
    get_store_health,
    list_platform_connections,
    list_store_authorizations,
    list_stores,
    mark_platform_connected,
    mark_platform_error,
    save_pending_authorization,
)
from app.schemas.dashboard import PlatformAuthorizationStatus
from app.schemas.platform_connections import (
    PlatformAuthorizationStartResponse,
    PlatformConnectionStatus,
    PlatformConnectionsSummary,
    PlatformName,
    StoreAuthorizationView,
    StoreHealthStatusView,
    StoreView,
)

DISPLAY_NAMES: dict[PlatformName, str] = {
    "shopee": "Shopee",
    "1688": "1688",
}

PLATFORM_ORDER: tuple[PlatformName, ...] = ("shopee", "1688")
STATE_TTL_SECONDS = 15 * 60


def _build_authorization_status(
    connections: list[PlatformConnectionStatus],
) -> PlatformAuthorizationStatus:
    connections_by_platform = {connection.platform: connection for connection in connections}
    missing_connections = [
        DISPLAY_NAMES[platform]
        for platform in PLATFORM_ORDER
        if not connections_by_platform[platform].connected
    ]

    if not missing_connections:
        guidance = "Shopee and 1688 are connected. Live actions are available."
    elif len(missing_connections) == 1:
        guidance = (
            f"Connect {missing_connections[0]} through its real authorization flow before running live actions."
        )
    else:
        guidance = "Connect Shopee and 1688 through their real authorization flows before running live actions."

    return PlatformAuthorizationStatus(
        shopee_connected=connections_by_platform["shopee"].connected,
        alibaba_connected=connections_by_platform["1688"].connected,
        can_load_live_data=not missing_connections,
        missing_connections=missing_connections,
        guidance=guidance,
    )


def _build_authorize_url(platform: PlatformName, state: str) -> str:
    if platform == "shopee":
        return build_shopee_authorize_url(state)
    return build_alibaba_authorize_url(state)


async def _exchange_authorization_code(platform: PlatformName, code: str):
    if platform == "shopee":
        from app.connectors.shopee.auth import exchange_code
        return await exchange_code(code)
    from app.connectors.alibaba1688.auth import exchange_code
    return await exchange_code(code)


def _state_secret() -> str:
    if settings.platform_auth_state_secret:
        return settings.platform_auth_state_secret
    return f"{settings.app_name}-dev-state-secret"


def _generate_state_token(platform: PlatformName) -> str:
    nonce = token_urlsafe(24)
    expires_at = int(time()) + STATE_TTL_SECONDS
    payload = f"{platform}:{nonce}:{expires_at}"
    signature = hmac_new(_state_secret().encode("utf-8"), payload.encode("utf-8"), sha256).hexdigest()
    return f"{nonce}.{expires_at}.{signature}"


def get_platform_authorization_status() -> PlatformAuthorizationStatus:
    return _build_authorization_status(list_platform_connections())


def list_platform_connections_view() -> PlatformConnectionsSummary:
    connections = list_platform_connections()
    return PlatformConnectionsSummary(
        items=connections,
        authorization=_build_authorization_status(connections),
    )


def start_platform_authorization(platform: PlatformName) -> PlatformAuthorizationStartResponse:
    state_token = _generate_state_token(platform)
    authorize_url = _build_authorize_url(platform, state_token)
    connection, _state_token = save_pending_authorization(platform, authorize_url, state_token)
    return PlatformAuthorizationStartResponse(
        platform=platform,
        status="pending",
        authorize_url=connection.authorize_url or "",
    )


async def complete_platform_authorization(
    platform: PlatformName,
    state: str | None,
    code: str | None,
    provider_error: str | None,
) -> PlatformConnectionStatus:
    pending_state = get_pending_state(platform)
    if not state or pending_state != state:
        raise ValueError("Invalid or expired authorization state")

    if provider_error:
        return mark_platform_error(platform, provider_error)

    if not code:
        raise ValueError("Missing authorization code")

    result = await _exchange_authorization_code(platform, code)
    return mark_platform_connected(
        platform,
        account_label=result.account.account_label,
        account_id=result.account.account_id,
        shop_id=result.account.shop_id,
        shop_name=result.account.shop_name,
        access_token=result.tokens.access_token,
        refresh_token=result.tokens.refresh_token,
        token_expires_at=result.tokens.expires_at.isoformat() if result.tokens.expires_at else None,
        capabilities=result.account.capabilities,
    )


def disconnect_platform_connection(platform: PlatformName) -> PlatformConnectionStatus:
    return disconnect_platform_record(platform)


def list_stores_view() -> list[StoreView]:
    return list_stores()


def list_store_authorizations_view(store_id: str) -> list[StoreAuthorizationView]:
    return list_store_authorizations(store_id)


def get_store_health_view(store_id: str) -> StoreHealthStatusView:
    return get_store_health(store_id)
