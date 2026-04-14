"""1688 OAuth 1.0a authentication - real implementation."""
import hashlib
import hmac
import time
import urllib.parse
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import httpx

from app.core.config import settings
from app.schemas.platform_connections import PlatformCapability


class AlibabaOAuthError(Exception):
    """Alibaba OAuth error."""
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


def _generate_signature(params: dict, secret: str) -> str:
    """Generate 1688 API signature (HMAC-SHA1).

    For OAuth token exchange, the signature is computed as:
      signature = hmac_sha1(secret, sorted_params_string)

    For API calls, the signature uses the param2/1 namespace prefix:
      signature = hmac_sha1(secret, "param2/1" + sorted_params_string + secret)

    The `use_namespace` flag controls which format to use.
    """
    sorted_params = sorted(params.items(), key=lambda x: x[0])
    param_str = "&".join(f"{k}={v}" for k, v in sorted_params)
    sign_str = f"param2/1{param_str}{secret}"
    return hmac.new(secret.encode(), sign_str.encode(), hashlib.sha1).hexdigest().upper()


def build_authorize_url(state_token: str) -> str:
    """Build 1688 OAuth authorization URL."""
    if not settings.alibaba_client_id:
        raise AlibabaOAuthError("ALIBABA_CLIENT_ID not configured")
    params = {
        "client_id": settings.alibaba_client_id,
        "redirect_uri": settings.alibaba_redirect_uri,
        "state": state_token,
        "view": "web",
    }
    return f"https://auth.1688.com/authorize?{urllib.parse.urlencode(params)}"


async def exchange_code(code: str) -> AuthorizationResult:
    """Exchange authorization code for access token via real 1688 OAuth API.

    1688 OpenAPI token endpoint: POST /openapi/param2/1/system.oauth2/token/{appKey}
    Uses the param2/1 namespace signature format required by 1688 API calls.
    """
    if not settings.alibaba_client_id or not settings.alibaba_client_secret:
        raise AlibabaOAuthError("1688 OAuth credentials not configured")

    token_url = f"https://gw.open.1688.com/openapi/param2/1/system.oauth2/token/{settings.alibaba_client_id}"

    timestamp = str(int(time.time() * 1000))
    params = {
        "grant_type": "authorization_code",
        "client_id": settings.alibaba_client_id,
        "code": code,
        "redirect_uri": settings.alibaba_redirect_uri,
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
        raise AlibabaOAuthError(f"Token exchange failed: {data.get('errorDescription', data.get('errorCode'))}")

    access_token = data.get("access_token", "")
    refresh_token = data.get("refresh_token")
    expire_in = data.get("expire_in", 3600)

    # Extract account info from token response
    member_id = data.get("memberId", "")
    member_name = data.get("memberName", "")

    return AuthorizationResult(
        tokens=AuthorizationTokens(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=datetime.now(UTC) + timedelta(seconds=expire_in),
        ),
        account=AuthorizedAccount(
            account_id=f"ali1688-{member_id}" if member_id else "ali1688-account",
            account_label=member_name if member_name else "1688 supplier account",
            shop_id=None,
            shop_name=member_name if member_name else "1688 Supplier Account",
            capabilities=["read_products", "read_shop"],
        ),
    )