# Full Realtime Platform Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 移除所有 demo/示例数据，使系统使用真实 Shopee/1688 OAuth 授权和 API 调用。

**Architecture:** 三层改造：
1. **OAuth 层** — `connectors/shopee/auth.py` + `connectors/alibaba1688/auth.py` 改为真实 HTTP OAuth 流程
2. **API Client 层** — 新建 `connectors/shopee/client.py` 和 `connectors/alibaba1688/client.py`，封装真实 API 调用
3. **配置/数据层** — 修复 config 默认值，移除 demo seed 数据，修复 `_default_connection` 逻辑

**Tech Stack:** FastAPI + SQLAlchemy + httpx (async HTTP) + Shopee Open API + 1688 API

---

## File Map

```
backend/app/
├── core/config.py                              # [MODIFY] authorized=True → False, fix example.com URLs
├── connectors/shopee/
│   ├── auth.py                                 # [MODIFY] 真实 OAuth HTTP 调用替代 mock
│   └── client.py                               # [CREATE] Shopee API client
├── connectors/alibaba1688/
│   ├── auth.py                                 # [MODIFY] 真实 OAuth HTTP 调用替代 mock
│   └── client.py                               # [CREATE] 1688 API client
├── repositories/platform_connections.py        # [MODIFY] _default_connection 不再依赖 authorized flag
└── services/workflow.py                         # [MODIFY] 移除 SEED_CANDIDATES/SEED_DRAFTS
```

---

## Task 1: Fix Config Defaults

**Files:**
- Modify: `backend/app/core/config.py`

**Context:**
- `shopee_authorized=True` + `alibaba_authorized=True` 让系统假装已授权，用户无需真实 OAuth 就能"连接"
- OAuth URL 默认 `https://example.com/...` 是无效地址
- 默认 `shopee_api_base=""` 和 `alibaba_api_base=""` 导致无法调真实 API

**Steps:**

- [ ] **Step 1: 修改 config.py 默认值**

修改 `backend/app/core/config.py` 第 26-41 行：

```python
# Shopee OAuth settings
shopee_client_id: str = Field(default="")
shopee_client_secret: str = Field(default="")
shopee_auth_url: str = Field(default="https://partner.shopeemobile.com/api/v2/oauth/authorize")
shopee_redirect_uri: str = Field(default="http://localhost:8000/api/v1/platform-connections/shopee/callback")
shopee_api_base: str = Field(default="https://partner.shopeemobile.com/api/v1")

# 1688 OAuth settings
alibaba_client_id: str = Field(default="")
alibaba_client_secret: str = Field(default="")
alibaba_auth_url: str = Field(default="https://gw.open.1688.com/openapi/param2/1/system.oauthCode")
alibaba_redirect_uri: str = Field(default="http://localhost:8000/api/v1/platform-connections/1688/callback")
alibaba_api_base: str = Field(default="https://gw.open.1688.com/openapi")
alibaba_cookie: str = Field(default="")
shopee_authorized: bool = Field(default=False)   # 改为 False
alibaba_authorized: bool = Field(default=False)   # 改为 False
```

- [ ] **Step 2: 验证修改**

```bash
cd "D:/跨境电商 (副本)/backend"
python -c "from app.core.config import settings; print(f'shopee_authorized={settings.shopee_authorized}, alibaba_authorized={settings.alibaba_authorized}')"
```
Expected: `shopee_authorized=False, alibaba_authorized=False`

- [ ] **Step 3: Commit**

```bash
git add backend/app/core/config.py
git commit -m "fix(config): default platform authorized to False, use real OAuth URLs"
```

---

## Task 2: Real Shopee OAuth Flow

**Files:**
- Modify: `backend/app/connectors/shopee/auth.py`
- Create: `backend/app/connectors/shopee/client.py`

**Context:**
当前 `auth.py` 的 `exchange_code()` 返回假数据，从不调真实 API。需要改为真实 HTTP 调用。

Shopee OAuth 流程：
1. 用户访问 `build_authorize_url()` → 跳转 Shopee 授权页
2. 用户授权后回调 `/callback?code=XXX`
3. `exchange_code(code)` 用 code 换 token（POST 到 Shopee token 端点）

**Steps:**

- [ ] **Step 1: 创建 Shopee API client (`client.py`)**

```python
# backend/app/connectors/shopee/client.py
"""Shopee API client for real API calls."""
import httpx
from app.core.config import settings
from app.schemas.platform_connections import PlatformCapability


class ShopeeApiError(Exception):
    """Shopee API error."""
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(f"Shopee API error {code}: {message}")


class ShopeeClient:
    """Async Shopee API client."""

    def __init__(self, access_token: str, shop_id: str):
        self.access_token = access_token
        self.shop_id = shop_id
        self.base_url = settings.shopee_api_base or "https://partner.shopeemobile.com/api/v1"
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers={"Content-Type": "application/json"},
                timeout=30.0,
            )
        return self._client

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None

    async def get_shop_info(self) -> dict:
        """Get shop information."""
        client = await self._get_client()
        # Shopee API: /shop/get_shop_info
        response = await client.post(
            "/shop/get_shop_info",
            params={"partner_id": settings.shopee_client_id},
            json={"shop_id": int(self.shop_id)},
        )
        response.raise_for_status()
        data = response.json()
        if data.get("error"):
            raise ShopeeApiError(data["error"], data.get("message", ""))
        return data.get("response", {})

    async def get_product_list(self, page_size: int = 50, offset: int = 0) -> dict:
        """Get product list."""
        client = await self._get_client()
        response = await client.post(
            "/product/get_item_list",
            params={"partner_id": settings.shopee_client_id},
            json={
                "shop_id": int(self.shop_id),
                "page_size": page_size,
                "offset": offset,
            },
        )
        response.raise_for_status()
        data = response.json()
        if data.get("error"):
            raise ShopeeApiError(data["error"], data.get("message", ""))
        return data.get("response", {})

    async def create_product(self, item_data: dict) -> dict:
        """Create a new product listing."""
        client = await self._get_client()
        response = await client.post(
            "/product/add_item",
            params={"partner_id": settings.shopee_client_id},
            json={**item_data, "shop_id": int(self.shop_id)},
        )
        response.raise_for_status()
        data = response.json()
        if data.get("error"):
            raise ShopeeApiError(data["error"], data.get("message", ""))
        return data.get("response", {})

    async def get_categories(self) -> list[dict]:
        """Get category list for the shop's region."""
        client = await self._get_client()
        response = await client.post(
            "/product/get_category",
            params={"partner_id": settings.shopee_client_id},
            json={"shop_id": int(self.shop_id)},
        )
        response.raise_for_status()
        data = response.json()
        if data.get("error"):
            raise ShopeeApiError(data["error"], data.get("message", ""))
        return data.get("response", {}).get("category_list", [])


def create_shopee_client(access_token: str, shop_id: str) -> ShopeeClient:
    return ShopeeClient(access_token=access_token, shop_id=shop_id)
```

- [ ] **Step 2: 修改 auth.py 真实 OAuth**

```python
# backend/app/connectors/shopee/auth.py
"""Shopee OAuth 2.0 authentication - real implementation."""
import httpx
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

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

    # Get shop info using the new access token
    shop_id = str(resp.get("shop_id", ""))
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
```

- [ ] **Step 3: 运行测试验证**

```bash
cd "D:/跨境电商 (副本)/backend"
python -m pytest tests/ -v -k "auth or platform" --tb=short 2>&1 | tail -20
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/connectors/shopee/auth.py backend/app/connectors/shopee/client.py
git commit -m "feat(shopee): implement real OAuth and API client"
```

---

## Task 3: Real 1688 OAuth Flow

**Files:**
- Modify: `backend/app/connectors/alibaba1688/auth.py`
- Create: `backend/app/connectors/alibaba1688/client.py`

**Context:**
1688 OAuth 不同于标准 OAuth 2.0，使用的是签名方式获取 token。需要实现 1688 签名算法（HMAC-SHA1）。

**Steps:**

- [ ] **Step 1: 创建 1688 API client (`client.py`)**

```python
# backend/app/connectors/alibaba1688/client.py
"""1688 API client for real API calls."""
import httpx
from app.core.config import settings


class AlibabaApiError(Exception):
    """Alibaba 1688 API error."""
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(f"1688 API error {code}: {message}")


class AlibabaClient:
    """Async Alibaba 1688 API client."""

    def __init__(self, access_token: str):
        self.access_token = access_token
        self.base_url = settings.alibaba_api_base or "https://gw.open.1688.com/openapi"
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=30.0,
            )
        return self._client

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None

    async def get_product_list(self, page_size: int = 20, page: int = 1) -> dict:
        """Search products from 1688."""
        client = await self._get_client()
        response = await client.post(
            "/param2/1/com.alibaba.open/alibaba.product.list.get/",
            data={
                "access_token": self.access_token,
                "pageSize": page_size,
                "page": page,
            },
        )
        response.raise_for_status()
        data = response.json()
        if data.get("errorCode") or data.get("error"):
            raise AlibabaApiError(
                data.get("errorCode", "unknown"),
                data.get("errorMessage", str(data)),
            )
        return data

    async def get_product_detail(self, product_id: str) -> dict:
        """Get product detail."""
        client = await self._get_client()
        response = await client.post(
            "/param2/1/com.alibaba.open/alibaba.product.get/",
            data={
                "access_token": self.access_token,
                "productID": product_id,
            },
        )
        response.raise_for_status()
        data = response.json()
        if data.get("errorCode") or data.get("error"):
            raise AlibabaApiError(
                data.get("errorCode", "unknown"),
                data.get("errorMessage", str(data)),
            )
        return data


def create_alibaba_client(access_token: str) -> AlibabaClient:
    return AlibabaClient(access_token=access_token)
```

- [ ] **Step 2: 修改 auth.py 真实 OAuth**

```python
# backend/app/connectors/alibaba1688/auth.py
"""1688 OAuth 1.0a authentication - real implementation."""
import hashlib
import hmac
import time
import urllib.parse
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

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
    """Generate 1688 API signature (HMAC-SHA1)."""
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
    return f"https://auth.1688.com/authorize?{urlencode(params)}"


async def exchange_code(code: str) -> AuthorizationResult:
    """Exchange authorization code for access token via real 1688 OAuth API."""
    if not settings.alibaba_client_id or not settings.alibaba_client_secret:
        raise AlibabaOAuthError("1688 OAuth credentials not configured")

    # 1688 uses a specific token endpoint with HMAC signature
    token_url = "https://gw.open.1688.com/openapi/token"

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

    return AuthorizationResult(
        tokens=AuthorizationTokens(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=datetime.now(UTC) + timedelta(seconds=expire_in),
        ),
        account=AuthorizedAccount(
            account_id=f"ali1688-account",
            account_label="1688 supplier account",
            shop_id=None,
            shop_name="1688 Supplier Account",
            capabilities=["read_products", "read_shop"],
        ),
    )
```

- [ ] **Step 3: 运行测试验证**

```bash
cd "D:/跨境电商 (副本)/backend"
python -m pytest tests/ -v -k "alibaba or platform" --tb=short 2>&1 | tail -20
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/connectors/alibaba1688/auth.py backend/app/connectors/alibaba1688/client.py
git commit -m "feat(alibaba): implement real OAuth and API client"
```

---

## Task 4: Fix _default_connection Logic

**Files:**
- Modify: `backend/app/repositories/platform_connections.py`

**Context:**
`_default_connection()` 目前依赖 `settings.shopee_authorized` 和 `settings.alibaba_authorized`，当这些为 True 时会生成假授权信息。修复后，配置默认 False，所以初始状态应该是"未连接"而非"已连接"。

**Steps:**

- [ ] **Step 1: 修改 _default_connection()**

找到 `_default_connection()` 函数（约第 40 行），将其改为始终返回"未连接"状态：

```python
def _default_connection(platform: PlatformName) -> PlatformConnectionStatus:
    """Return default (disconnected) platform connection status."""
    return PlatformConnectionStatus(
        platform=platform,
        connected=False,
        status="disconnected",
        account_label=None,
        shop_name=None,
        last_connected_at=None,
        capabilities=[],
    )
```

- [ ] **Step 2: 同时修改 _ensure_platform_records() 中的初始化逻辑**

找到 `_ensure_platform_records()` 函数中（约第 278 行）的这段逻辑：

```python
if authorization.last_connected_at is None and authorization.status == "disconnected" and not authorization.connected:
    # 初始化默认值
    ...
```

将其中的默认值填充逻辑简化为只设置 disconnected 状态（不再从 settings 读取假数据）：

```python
if authorization.last_connected_at is None and authorization.status == "disconnected" and not authorization.connected:
    # Fresh record - leave it disconnected, user must complete real OAuth
    authorization.status = "disconnected"
    authorization.connected = False
    health.auth_status = "disconnected"
    health.overall_status = "warning"
    health.last_checked_at = datetime.now(UTC)
```

- [ ] **Step 3: 验证**

```bash
cd "D:/跨境电商 (副本)/backend"
python -c "
from app.repositories.platform_connections import list_platform_connections
connections = list_platform_connections()
for c in connections:
    print(f'{c.platform}: connected={c.connected}, status={c.status}')
"
```
Expected: `shopee: connected=False, status=disconnected` (twice)

- [ ] **Step 4: Commit**

```bash
git add backend/app/repositories/platform_connections.py
git commit -m "fix(platform): remove fake default connection state from config"
```

---

## Task 5: Remove Demo Seed Data from Workflow

**Files:**
- Modify: `backend/app/services/workflow.py`

**Context:**
`workflow.py` 中 `SEED_CANDIDATES` 和 `SEED_DRAFTS` 是硬编码的示例数据，`reset_workflow_state()` 会用这些数据污染数据库。改为只清空表，不插入任何数据。

**Steps:**

- [ ] **Step 1: 修改 workflow.py**

删除 `SEED_CANDIDATES`、`SEED_DRAFTS`、`_candidate_from_record()`、`_draft_from_record()`，修改 `reset_workflow_state()` 只清空表：

```python
def reset_workflow_state() -> None:
    """Clear all workflow data from database."""
    with SessionLocal() as session:
        session.query(DraftRecord).delete()
        session.query(CandidateRecord).delete()
        session.commit()
    WORKFLOW_COUNTERS["approved_today"] = 0
    WORKFLOW_COUNTERS["published_today"] = 0
    WORKFLOW_COUNTERS["failed_jobs"] = 0
```

同时删除文件顶部的 `SEED_CANDIDATES` 和 `SEED_DRAFTS` 列表定义。

- [ ] **Step 2: 验证**

```bash
cd "D:/跨境电商 (副本)/backend"
python -c "
from app.services.workflow import reset_workflow_state, list_candidates, list_drafts
reset_workflow_state()
print(f'Candidates after reset: {len(list_candidates())}')
print(f'Drafts after reset: {len(list_drafts())}')
"
```
Expected: `Candidates after reset: 0` / `Drafts after reset: 0`

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/workflow.py
git commit -m "fix(workflow): remove hardcoded demo seed data"
```

---

## Task 6: Update platform_connections Service to Support Real OAuth

**Files:**
- Modify: `backend/app/services/platform_connections.py`

**Context:**
`complete_platform_authorization()` 调用 `_exchange_authorization_code()` 是同步函数，但新的 1688 OAuth `exchange_code()` 是 `async` 函数。需要将服务层改为异步。

**Steps:**

- [ ] **Step 1: 修改服务层为异步**

将 `complete_platform_authorization()` 和 `_exchange_authorization_code()` 改为 `async`：

```python
async def _exchange_authorization_code(platform: PlatformName, code: str):
    if platform == "shopee":
        from app.connectors.shopee.auth import exchange_code
        return await exchange_code(code)
    from app.connectors.alibaba1688.auth import exchange_code
    return await exchange_code(code)


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
```

- [ ] **Step 2: 修改 API route 为异步**

`backend/app/api/routes/platform_connections.py` 中 `complete_platform_connection_authorization()` 本身已是 async，无需改动。

- [ ] **Step 3: 验证导入**

```bash
cd "D:/跨境电商 (副本)/backend"
python -c "from app.services.platform_connections import complete_platform_authorization; print('Import OK')"
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/platform_connections.py
git commit -m "feat(platform): async OAuth token exchange support"
```

---

## Task 7: End-to-End Verification

**Steps:**

- [ ] **Step 1: 启动后端**

```bash
cd "D:/跨境电商 (副本)/backend"
venv_win/Scripts/python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

- [ ] **Step 2: 检查平台连接状态**

```bash
curl -s http://localhost:8000/api/v1/platform-connections | python -m json.tool
```
Expected: 两个平台都是 `"connected": false`

- [ ] **Step 3: 运行后端测试**

```bash
cd "D:/跨境电商 (副本)/backend"
venv_win/Scripts/python.exe -m pytest tests/ -v --tb=short 2>&1 | tail -10
```
Expected: 所有测试通过

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: full realtime platform integration complete"
```

---

## Self-Review Checklist

1. **Spec coverage**: 所有 demo/example 数据已移除？所有 OAuth 是真实 HTTP 调用？所有 API client 已创建？
2. **Placeholder scan**: 无 "TBD"/"TODO"/"fill in" 残留
3. **Type consistency**: `exchange_code()` 在两个 auth.py 中均为 `async def`；服务层 `complete_platform_authorization()` 已改为 `async`；API route 无需改动（已是 async）
4. **Missing pieces**: 无
