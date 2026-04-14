"""1688 token refresh - OAuth 2.0 token rotation."""
import hashlib
import hmac
import time as _time
import urllib.parse
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import httpx

from app.core.config import settings


class AlibabaRefreshError(Exception):
    pass


@dataclass(frozen=True)
class RefreshedTokens:
    access_token: str
    refresh_token: str | None
    expires_at: datetime


def _generate_signature(params: dict, secret: str) -> str:
    """Generate 1688 API signature (HMAC-SHA1) for token refresh."""
    sorted_params = sorted(params.items(), key=lambda x: x[0])
    param_str = "&".join(f"{k}={v}" for k, v in sorted_params)
    sign_str = f"param2/1{param_str}{secret}"
    return hmac.new(secret.encode(), sign_str.encode(), hashlib.sha1).hexdigest().upper()


async def refresh_access_token(refresh_token: str) -> RefreshedTokens:
    """Refresh a 1688 access token using the refresh_token grant.

    1688 OpenAPI: POST /openapi/param2/1/system.oauth2/refreshToken/{appKey}
    """
    if not settings.alibaba_client_id or not settings.alibaba_client_secret:
        raise AlibabaRefreshError("1688 OAuth credentials not configured")

    token_url = f"https://gw.open.1688.com/openapi/param2/1/system.oauth2/refreshToken/{settings.alibaba_client_id}"

    timestamp = str(int(_time.time() * 1000))
    params = {
        "grant_type": "refresh_token",
        "client_id": settings.alibaba_client_id,
        "refresh_token": refresh_token,
        "timestamp": timestamp,
    }

    signature = _generate_signature(params, settings.alibaba_client_secret)

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            token_url,
            data={**params, "signature": signature},
        )
        response.raise_for_status()
        data = response.json()

    if data.get("errorCode"):
        raise AlibabaRefreshError(f"Token refresh failed: {data.get('errorDescription', data.get('errorCode'))}")

    access_token = data.get("access_token", "")
    new_refresh_token = data.get("refresh_token")
    expire_in = data.get("expire_in", 3600)

    if not access_token:
        raise AlibabaRefreshError("Token refresh response missing access_token")

    return RefreshedTokens(
        access_token=access_token,
        refresh_token=new_refresh_token,
        expires_at=datetime.now(UTC) + timedelta(seconds=expire_in),
    )
