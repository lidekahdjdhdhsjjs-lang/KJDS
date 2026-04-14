# Guided OAuth Authorization — Design Spec

> **For agentic workers:** Use superpowers:writing-plans to create implementation plan, then superpowers:subagent-driven-development to execute.

**Goal:** Replace the current OAuth flow (which silently pretends to be "connected" without any real authorization) with a guided,小白-friendly OAuth authorization flow using official platform OAuth endpoints.

**Architecture:** The user clicks "登录Shopee/1688", a new browser tab opens the official platform authorization page, and the original page polls the server every 2 seconds until authorization completes. No local browser, no account/password storage — just official OAuth.

---

## User Experience

### Flow

1. User opens `/settings/platform-connections`
2. Sees "连接 Shopee" button and 3-step instructions
3. Clicks button → new tab opens → redirected to Shopee's official OAuth page
4. Original page shows "等待授权中..." with spinner, polling every 2s
5. User logs in on Shopee, clicks Authorize
6. Shopee redirects back to `/callback` → DB updated → poll detects `connected=true`
7. Original page shows "授权成功 ✅" with account details
8. If user closes tab without authorizing, poll times out (5 min) → shows "授权超时，请重试"

### States

| State | UI Message | Action |
|-------|-----------|--------|
| `disconnected` | "点击「开始授权」连接你的账号" | Show start button |
| `pending` | "等待授权中...（轮询中）" | Show spinner, poll |
| `connected` | "✅ 已连接：{account_label}" | Show success + disconnect button |
| `error` | "❌ 授权失败：{message}" | Show error + retry button |
| `timeout` | "⏰ 授权超时，请重新授权" | Show retry button |

---

## API Changes

### New Endpoint

```
GET /api/v1/platform-connections/{platform}/status
```

Returns:
```json
{
  "platform": "shopee",
  "status": "disconnected | pending | connected | error | timeout",
  "account_label": "My Shop",
  "error_message": null,
  "pending_state": null
}
```

No authentication required — this endpoint is publicly pollable during the OAuth flow.

### Modified Endpoint

```
POST /api/v1/platform-connections/{platform}/start
```

Returns (unchanged structure):
```json
{
  "platform": "shopee",
  "status": "pending",
  "authorize_url": "https://partner.shopeemobile.com/api/v2/oauth/authorize?..."
}
```

Also returns `pending_state` in response (needed by frontend to validate callback).

### Callback Behavior

`GET /api/v1/platform-connections/{platform}/callback`

After successful OAuth exchange, updates DB → `connected=true`. Then redirects to:
```
{frontend_base_url}/dashboard?authorization_platform=shopee&authorization_status=connected
```

On error:
```
{frontend_base_url}/dashboard?authorization_platform=shopee&authorization_status=error
```

### Polling Endpoint

The frontend polls `GET /api/v1/platform-connections/{platform}/status` every 2 seconds.

- If `status=pending` and `pending_state` matches the one from `start`: continue polling
- If `status=connected`: stop polling, show success
- If `status=error`: stop polling, show error
- If after 5 minutes still `pending`: stop polling, show timeout

---

## Frontend Changes

### Guided Authorization Component

Replace the current simple "连接" button with a multi-step guided component:

```
Step 1: Show initial state with:
  - Platform icon
  - "连接 {Platform} 账号" title
  - 3-step instruction text
  - [🚀 开始授权] button

Step 2: After clicking start:
  - Opens new tab to authorize_url
  - Shows spinner + "等待授权中..."
  - Shows elapsed time counter
  - [取消] button

Step 3: On connected:
  - Green checkmark animation
  - "授权成功！"
  - Account details (label, capabilities)
  - [断开连接] button

Step 4: On error:
  - Red X icon
  - Error message
  - [重新授权] button

Step 5: On timeout:
  - Clock icon
  - "授权超时"
  - [重新授权] button
```

### Polling Logic

```typescript
const POLL_INTERVAL = 2000; // ms
const POLL_TIMEOUT = 300000; // 5 minutes

function startPolling(platform: string, pendingState: string) {
  const interval = setInterval(async () => {
    const status = await fetchStatus(platform);

    if (status.pending_state !== pendingState) {
      // Different authorization flow, ignore
      return;
    }

    if (status.status === 'connected') {
      clearInterval(interval);
      showSuccess(status);
    } else if (status.status === 'error') {
      clearInterval(interval);
      showError(status.error_message);
    } else if (Date.now() - startTime > POLL_TIMEOUT) {
      clearInterval(interval);
      showTimeout();
    }
  }, POLL_INTERVAL);
}
```

### Dashboard Auto-Update

After OAuth callback redirect to `/dashboard`, the page should immediately call `GET /api/v1/platform-connections` to refresh connection status and show a toast notification.

---

## Backend Changes

### New Service Function

`backend/app/services/platform_connections.py`:

```python
def get_platform_connection_status(platform: PlatformName) -> dict:
    """Return current connection status for polling."""
    with SessionLocal() as session:
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
            if authorization.pending_state_expires_at < datetime.now(UTC):
                return {
                    "platform": platform,
                    "status": "timeout",
                    "pending_state": None,
                    ...
                }
            return {
                "platform": platform,
                "status": "pending",
                "pending_state": authorization.pending_state,
                ...
            }

        return {
            "platform": platform,
            "status": authorization.status,  # connected, error, disconnected
            "pending_state": None,
            ...
        }
```

### New Route

`backend/app/api/routes/platform_connections.py`:

```python
@router.get("/{platform}/status")
async def get_connection_status(
    platform: PlatformName,
) -> ApiResponse[PlatformConnectionStatus]:
    status = get_platform_connection_status(platform)
    return ApiResponse(success=True, data=status)
```

---

## File Changes

```
backend/app/
├── api/routes/platform_connections.py     # [MODIFY] add GET /{platform}/status
├── services/platform_connections.py        # [MODIFY] add get_platform_connection_status()
└── schemas/platform_connections.py        # [MODIFY] add pending_state to response

frontend/app/
├── settings/platform-connections/
│   └── page.tsx                          # [MODIFY] replace with guided component
└── components/
    ├── GuidedAuthModal.tsx               # [CREATE] new guided auth modal
    └── PlatformConnectionCard.tsx         # [CREATE] reusable connection status card
```

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| User closes OAuth tab without authorizing | Poll times out at 5 min → show timeout UI |
| OAuth code expired | Platform returns error → show error message |
| Network failure during poll | Continue polling (transient) |
| Multiple rapid start attempts | Cancel previous pending_state, start fresh |
| Callback called for wrong state | Frontend ignores (pending_state mismatch) |

---

## Security Considerations

- `pending_state` is a signed HMAC token — cannot be forged
- `pending_state_expires_at` prevents indefinite pending state (15 min TTL)
- Tokens stored as plaintext in DB (acceptable for MVP, noted for future encryption)
- CORS must allow frontend origin to receive callback redirect
- No credentials stored in localStorage/sessionStorage — only in DB via secure HTTPS

---

## Testing Strategy

### Unit Tests
- `get_platform_connection_status()` returns correct status for each DB state
- Pending state expiry detection
- Frontend polling logic with mock fetch

### Integration Tests
- OAuth flow end-to-end with mock Shopee/1688 endpoints
- Polling detects connected status within 3 seconds
- Timeout triggers correctly

### E2E Tests (Playwright)
- Click "开始授权" → new tab opens correct URL
- Poll detects connected after mock callback
- Timeout UI shows after expiration
