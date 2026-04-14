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
from app.db import SessionLocal
from app.models import StoreAuthorizationRecord
from app.repositories.platform_connections import (
    disconnect_platform as disconnect_platform_record,
    get_decrypted_tokens,
    get_pending_state,
    get_platform_connection,
    get_store_health,
    list_platform_connections,
    list_store_authorizations,
    list_stores,
    mark_platform_connected,
    mark_platform_error,
    save_pending_authorization,
    update_tokens,
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
    if settings.app_env in ("development", "test"):
        return f"{settings.app_name}-dev-state-secret"
    raise ValueError("PLATFORM_AUTH_STATE_SECRET must be set in production")


def _generate_state_token(platform: PlatformName) -> str:
    nonce = token_urlsafe(24)
    expires_at = int(time()) + STATE_TTL_SECONDS
    payload = f"{platform}:{nonce}:{expires_at}"
    signature = hmac_new(_state_secret().encode("utf-8"), payload.encode("utf-8"), sha256).hexdigest()
    return f"{nonce}.{expires_at}.{signature}"


def _verify_state_token(platform: PlatformName, state: str) -> None:
    """Verify the HMAC signature of an OAuth state token independently of DB lookup.

    This provides CSRF protection even if the DB is compromised.
    Raises ValueError if the signature is invalid or the token has expired.
    """
    parts = state.split(".")
    if len(parts) != 3:
        raise ValueError("Invalid state token format")

    nonce, expires_at_str, signature = parts

    # Check token expiry
    try:
        expires_at = int(expires_at_str)
    except ValueError:
        raise ValueError("Invalid state token expiry")
    if expires_at < int(time()):
        raise ValueError("State token has expired")

    # Re-compute HMAC and compare
    payload = f"{platform}:{nonce}:{expires_at_str}"
    expected = hmac_new(_state_secret().encode("utf-8"), payload.encode("utf-8"), sha256).hexdigest()
    if signature != expected:
        raise ValueError("Invalid state token signature")


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
        pending_state=_state_token,
    )


async def complete_platform_authorization(
    platform: PlatformName,
    state: str | None,
    code: str | None,
    provider_error: str | None,
) -> PlatformConnectionStatus:
    if not state:
        raise ValueError("Missing state parameter")

    # Verify HMAC signature independently of DB lookup (CSRF protection)
    _verify_state_token(platform, state)

    pending_state = get_pending_state(platform)
    if pending_state != state:
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


async def refresh_platform_tokens(platform: PlatformName) -> PlatformConnectionStatus:
    """Refresh OAuth tokens for a platform if they are expired or about to expire.

    Returns the updated connection status. Raises ValueError if the platform
    is not connected or has no refresh token.
    """
    access_token, refresh_token, expires_at = get_decrypted_tokens(platform)

    if not access_token or not refresh_token:
        raise ValueError(f"No tokens to refresh for {platform}")

    if expires_at is None:
        raise ValueError(f"No token expiry recorded for {platform}")

    # Only refresh if within 10 minutes of expiry or already expired
    from datetime import UTC, datetime as dt, timedelta as td
    now = dt.now(UTC)
    if expires_at > now + td(minutes=10):
        # Token is still valid for more than 10 minutes, no refresh needed
        return get_platform_connection(platform)

    if platform == "shopee":
        from app.connectors.shopee.refresh import refresh_access_token as shopee_refresh
        result = await shopee_refresh(refresh_token)
    else:
        from app.connectors.alibaba1688.refresh import refresh_access_token as alibaba_refresh
        result = await alibaba_refresh(refresh_token)

    update_tokens(
        platform,
        access_token=result.access_token,
        refresh_token=result.refresh_token,
        token_expires_at=result.expires_at,
    )
    return get_platform_connection(platform)


def list_stores_view() -> list[StoreView]:
    return list_stores()


def list_store_authorizations_view(store_id: str) -> list[StoreAuthorizationView]:
    return list_store_authorizations(store_id)


def get_store_health_view(store_id: str) -> StoreHealthStatusView:
    return get_store_health(store_id)


def get_platform_connection_status(platform: PlatformName) -> dict:
    """Return current connection status for frontend polling.

    Returns dict with:
      - platform: platform name
      - status: 'disconnected' | 'pending' | 'connected' | 'error' | 'timeout'
      - account_label: display name of connected account (if connected)
      - error_message: error description (if error)
      - pending_state: current HMAC state token (if pending)
    """
    with SessionLocal() as session:
        from sqlalchemy import select

        authorization = session.scalar(
            select(StoreAuthorizationRecord)
            .where(StoreAuthorizationRecord.platform == platform)
        )

        if authorization is None:
            return {
                "platform": platform,
                "status": "disconnected",
                "account_label": None,
                "error_message": None,
                "pending_state": None,
            }

        if authorization.status == "pending":
            # Check if pending has expired
            expires_at = authorization.pending_state_expires_at
            if expires_at is not None:
                from datetime import UTC
                from datetime import datetime as dt
                expires_at_utc = expires_at.replace(tzinfo=UTC) if expires_at.tzinfo is None else expires_at
                if expires_at_utc < dt.now(UTC):
                    return {
                        "platform": platform,
                        "status": "timeout",
                        "account_label": None,
                        "error_message": None,
                        "pending_state": None,
                    }
            return {
                "platform": platform,
                "status": "pending",
                "account_label": None,
                "error_message": None,
                "pending_state": authorization.pending_state,
            }

        # connected, error, or disconnected
        return {
            "platform": platform,
            "status": authorization.status,
            "account_label": authorization.account_label,
            "error_message": authorization.last_error,
            "pending_state": None,
        }
