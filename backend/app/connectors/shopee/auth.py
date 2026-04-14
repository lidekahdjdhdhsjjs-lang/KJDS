"""Shopee OAuth 2.0 authentication - real implementation."""
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

import httpx

from app.core.config import settings
from app.schemas.platform_connections import PlatformCapability


class ShopeeOAuthError(Exception):
    """Shopee OAuth error."""
    pass


@dataclass(frozen=True)
class AuthorizationTokens:
    access_token: str
    refresh_token: str | None
    expires_at: datetime


@dataclass(frozen=True)
class AuthorizedAccount:
    account_id: str
    account_label: str
    shop_id: str | None
    shop_name: str | None
    capabilities: list[PlatformCapability]


@dataclass(frozen=True)
class AuthorizationResult:
    tokens: AuthorizationTokens
    account: AuthorizedAccount


def build_authorize_url(state_token: str) -> str:
    """Build Shopee OAuth authorization URL."""
    if not settings.shopee_client_id:
        raise ShopeeOAuthError("SHOPEE_CLIENT_ID not configured")
    query = urlencode(
        {
            "partner_id": settings.shopee_client_id,
            "redirect_uri": settings.shopee_redirect_uri,
            "state": state_token,
            "response_type": "code",
        }
    )
    return f"{settings.shopee_auth_url}?{query}"


async def exchange_code(code: str) -> AuthorizationResult:
    """Exchange authorization code for access token via real Shopee OAuth API."""
    if not settings.shopee_client_id or not settings.shopee_client_secret:
        raise ShopeeOAuthError("Shopee OAuth credentials not configured")

    token_url = "https://partner.shopeemobile.com/api/v2/auth/token/access"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            token_url,
            json={
                "partner_id": int(settings.shopee_client_id),
                "partner_secret": settings.shopee_client_secret,
                "code": code,
                "grant_type": "authorization_code",
            },
        )
        response.raise_for_status()
        data = response.json()

    if data.get("error"):
        raise ShopeeOAuthError(f"Token exchange failed: {data.get('message', data['error'])}")

    resp = data.get("response", {})
    access_token = resp.get("access_token", "")
    refresh_token = resp.get("refresh_token")
    expire_seconds = resp.get("expire_in", 14400)

    shop_id = str(resp.get("shop_id", ""))
    if not shop_id:
        raise ShopeeOAuthError("Token exchange response missing shop_id")
    shop_name = f"Shopee Shop {shop_id}"
    account_id = f"shopee-{shop_id}"

    return AuthorizationResult(
        tokens=AuthorizationTokens(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=datetime.now(UTC) + timedelta(seconds=expire_seconds),
        ),
        account=AuthorizedAccount(
            account_id=account_id,
            account_label=f"Shopee shop {shop_id}",
            shop_id=shop_id,
            shop_name=shop_name,
            capabilities=["read_products", "read_shop", "publish_listings"],
        ),
    )
