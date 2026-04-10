from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

from app.core.config import settings
from app.schemas.platform_connections import PlatformCapability


@dataclass(frozen=True)
class AuthorizationTokens:
    access_token: str
    refresh_token: str | None
    expires_at: datetime | None


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
    query = urlencode(
        {
            "client_id": settings.alibaba_client_id,
            "redirect_uri": settings.alibaba_redirect_uri,
            "state": state_token,
        }
    )
    return f"{settings.alibaba_auth_url}?{query}"


def exchange_code(code: str) -> AuthorizationResult:
    normalized_code = code.strip()
    account_id = f"ali1688-account-{normalized_code}"
    shop_id = f"supplier-{normalized_code}"
    tokens = AuthorizationTokens(
        access_token=f"ali1688-access-{normalized_code}",
        refresh_token=f"ali1688-refresh-{normalized_code}",
        expires_at=datetime.now(UTC) + timedelta(hours=12),
    )
    account = AuthorizedAccount(
        account_id=account_id,
        account_label=f"1688 supplier {normalized_code}",
        shop_id=shop_id,
        shop_name=f"1688 Supplier {normalized_code}",
        capabilities=["read_products", "read_shop"],
    )
    return AuthorizationResult(tokens=tokens, account=account)
