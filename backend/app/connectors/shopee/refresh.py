"""Shopee token refresh - OAuth 2.0 token rotation."""
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import httpx

from app.core.config import settings


class ShopeeRefreshError(Exception):
    pass


@dataclass(frozen=True)
class RefreshedTokens:
    access_token: str
    refresh_token: str | None
    expires_at: datetime


async def refresh_access_token(refresh_token: str) -> RefreshedTokens:
    """Refresh a Shopee access token using the refresh_token grant.

    Shopee API v2: POST /api/v2/auth/access_token/get
    """
    if not settings.shopee_client_id or not settings.shopee_client_secret:
        raise ShopeeRefreshError("Shopee OAuth credentials not configured")

    token_url = "https://partner.shopeemobile.com/api/v2/auth/access_token/get"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            token_url,
            json={
                "partner_id": int(settings.shopee_client_id),
                "partner_secret": settings.shopee_client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
        )
        response.raise_for_status()
        data = response.json()

    if data.get("error"):
        raise ShopeeRefreshError(f"Token refresh failed: {data.get('message', data['error'])}")

    resp = data.get("response", {})
    access_token = resp.get("access_token", "")
    new_refresh_token = resp.get("refresh_token")
    expire_seconds = resp.get("expire_in", 14400)

    if not access_token:
        raise ShopeeRefreshError("Token refresh response missing access_token")

    return RefreshedTokens(
        access_token=access_token,
        refresh_token=new_refresh_token,
        expires_at=datetime.now(UTC) + timedelta(seconds=expire_seconds),
    )
