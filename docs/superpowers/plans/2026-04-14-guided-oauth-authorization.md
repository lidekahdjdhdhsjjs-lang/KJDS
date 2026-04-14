# Guided OAuth Authorization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add guided OAuth authorization UI so users click a button, get redirected to official platform login, and the original page auto-detects completion via polling.

**Architecture:** New `GET /{platform}/status` endpoint returns current auth state. Frontend polls every 2 seconds. On callback redirect, dashboard shows success/error toast.

**Tech Stack:** FastAPI (backend) + Next.js 15 (frontend) + React + Ink (existing)

---

## File Map

```
backend/app/
├── schemas/platform_connections.py         # [MODIFY] add pending_state to PlatformAuthorizationStartResponse
├── services/platform_connections.py       # [MODIFY] add get_platform_connection_status()
└── api/routes/platform_connections.py     # [MODIFY] add GET /{platform}/status

frontend/
├── lib/api.ts                            # [MODIFY] add fetchConnectionStatus()
├── components/
│   └── GuidedAuthModal.tsx              # [CREATE] guided auth modal component
└── app/settings/platform-connections/
    └── page.tsx                          # [MODIFY] replace with guided auth integration
```

---

## Task 1: Backend Schema — Add pending_state to Start Response

**Files:**
- Modify: `backend/app/schemas/platform_connections.py`

**Context:**
`PlatformAuthorizationStartResponse` currently returns only `platform`, `status`, and `authorize_url`. We need to also return `pending_state` so the frontend can validate which authorization flow it's tracking during polling.

**Steps:**

- [ ] **Step 1: Modify schema**

In `backend/app/schemas/platform_connections.py`, find `PlatformAuthorizationStartResponse` (line 32-35) and add `pending_state` field:

```python
class PlatformAuthorizationStartResponse(BaseModel):
    platform: PlatformName
    status: Literal["pending"]
    authorize_url: str
    pending_state: str  # NEW: HMAC state token for polling validation
```

- [ ] **Step 2: Verify**

```bash
cd "D:/跨境电商 (副本)/backend"
python -c "from app.schemas.platform_connections import PlatformAuthorizationStartResponse; print(PlatformAuthorizationStartResponse.model_fields.keys())"
```
Expected: `dict_keys(['platform', 'status', 'authorize_url', 'pending_state'])`

- [ ] **Step 3: Commit**

```bash
git add backend/app/schemas/platform_connections.py
git commit -m "feat(schemas): add pending_state to PlatformAuthorizationStartResponse"
```

---

## Task 2: Backend Service — Add get_platform_connection_status()

**Files:**
- Modify: `backend/app/services/platform_connections.py`

**Context:**
Need a new service function that reads the DB and returns the current authorization status including `pending_state`. This is what the polling endpoint will call.

**Steps:**

- [ ] **Step 1: Read existing repository functions**

First, check what `get_pending_state` and `get_platform_connection` look like in `backend/app/repositories/platform_connections.py`:
```bash
grep -n "def get_pending_state\|def get_platform_connection" "D:/跨境电商 (副本)/backend/app/repositories/platform_connections.py"
```

- [ ] **Step 2: Add get_platform_connection_status() service function**

Add at the end of `backend/app/services/platform_connections.py`:

```python
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
        from app.models import StoreAuthorizationRecord
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
```

- [ ] **Step 3: Verify**

```bash
cd "D:/跨境电商 (副本)/backend"
python -c "
from app.services.platform_connections import get_platform_connection_status
result = get_platform_connection_status('shopee')
print(f'status={result[\"status\"]}, pending_state={result[\"pending_state\"]}')
"
```
Expected: `status=disconnected, pending_state=None`

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/platform_connections.py
git commit -m "feat(platform): add get_platform_connection_status() for polling"
```

---

## Task 3: Backend Route — Add GET /{platform}/status

**Files:**
- Modify: `backend/app/api/routes/platform_connections.py`

**Context:**
Add a new public endpoint that requires no authentication (so the frontend can poll it without auth headers during the OAuth flow).

**Steps:**

- [ ] **Step 1: Add the route**

Find the existing `@router.post("/{platform}/start")` in `backend/app/api/routes/platform_connections.py`, and add the new GET endpoint right before or after it (around line 43):

```python
@router.get("/{platform}/status")
async def get_connection_status(
    platform: PlatformName,
) -> ApiResponse[dict]:
    """Get current platform connection status for polling.

    No authentication required — this endpoint is publicly pollable during OAuth.
    """
    status = get_platform_connection_status(platform)
    return ApiResponse(success=True, data=status)
```

Also add the import at the top:
```python
from app.services.platform_connections import (
    get_platform_connection_status,  # ADD this
    # ... existing imports
)
```

- [ ] **Step 2: Verify**

```bash
curl -s http://localhost:8000/api/v1/platform-connections/shopee/status
```
Expected: JSON with `{"success":true,"data":{"platform":"shopee","status":"disconnected",...}}`

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/routes/platform_connections.py
git commit -m "feat(platform): add GET /{platform}/status polling endpoint"
```

---

## Task 4: Frontend API — Add fetchConnectionStatus()

**Files:**
- Modify: `frontend/lib/api.ts`

**Context:**
Need a frontend API function to poll `GET /{platform}/status`. This function does NOT need auth headers (endpoint is public).

**Steps:**

- [ ] **Step 1: Add the function**

Add after `startPlatformAuthorization` (around line 226 in `frontend/lib/api.ts`):

```typescript
export type ConnectionStatus = {
  platform: 'shopee' | '1688';
  status: 'disconnected' | 'pending' | 'connected' | 'error' | 'timeout';
  account_label: string | null;
  error_message: string | null;
  pending_state: string | null;
};

export async function fetchConnectionStatus(
  platform: 'shopee' | '1688',
): Promise<ConnectionStatus> {
  const response = await fetch(`${API_BASE}/platform-connections/${platform}/status`);
  return parseApiResponse<ConnectionStatus>(response, `Failed to fetch ${platform} status`);
}
```

- [ ] **Step 2: Also add pending_state to start response type**

Find `PlatformAuthorizationStartResponse` and add:
```typescript
export type PlatformAuthorizationStartResponse = {
  platform: 'shopee' | '1688';
  status: 'pending';
  authorize_url: string;
  pending_state: string;  // ADD this
};
```

- [ ] **Step 3: Verify types compile**

```bash
cd "D:/跨境电商 (副本)/frontend"
npx tsc --noEmit 2>&1 | head -20
```
Expected: No errors related to our new types

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat(api): add fetchConnectionStatus() and pending_state type"
```

---

## Task 5: Frontend — Create GuidedAuthModal Component

**Files:**
- Create: `frontend/components/GuidedAuthModal.tsx`

**Context:**
This is the core UI component that replaces the simple "连接" button with a multi-step guided flow.

**Steps:**

- [ ] **Step 1: Create the component**

```typescript
// frontend/components/GuidedAuthModal.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchConnectionStatus,
  startPlatformAuthorization,
  disconnectPlatform,
  type ConnectionStatus,
} from '@/lib/api';

const POLL_INTERVAL = 2000; // ms
const POLL_TIMEOUT = 300000; // 5 minutes

type AuthState = 'idle' | 'loading' | 'pending' | 'connected' | 'error' | 'timeout';

type Props = {
  platform: 'shopee' | '1688';
  platformLabel: string;
  platformColor: string; // e.g. '#FA594E' for Shopee orange-red
  onStateChange?: (connected: boolean) => void;
};

export function GuidedAuthModal({ platform, platformLabel, platformColor, onStateChange }: Props) {
  const [authState, setAuthState] = useState<AuthState>('idle');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pendingState, setPendingState] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Initialize: check current status on mount
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      const status = await fetchConnectionStatus(platform);
      setConnectionStatus(status);

      if (status.status === 'connected') {
        setAuthState('connected');
        onStateChange?.(true);
      } else if (status.status === 'error') {
        setAuthState('error');
        setErrorMessage(status.error_message || 'Authorization failed');
      }
    } catch {
      // Ignore polling errors silently
    }
  }, [platform, onStateChange]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback((initialPendingState: string) => {
    stopPolling();
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);

    intervalRef.current = setInterval(async () => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsedSeconds(elapsed);

      // Check timeout
      if (Date.now() - startTimeRef.current > POLL_TIMEOUT) {
        stopPolling();
        setAuthState('timeout');
        return;
      }

      try {
        const status = await fetchConnectionStatus(platform);

        // Ignore if this is a different pending flow
        if (status.pending_state && status.pending_state !== initialPendingState) {
          return;
        }

        if (status.status === 'connected') {
          stopPolling();
          setAuthState('connected');
          setConnectionStatus(status);
          onStateChange?.(true);
        } else if (status.status === 'error') {
          stopPolling();
          setAuthState('error');
          setErrorMessage(status.error_message || 'Authorization failed');
        }
        // else pending — continue polling
      } catch {
        // Continue polling on network error
      }
    }, POLL_INTERVAL);
  }, [platform, onStateChange, stopPolling]);

  const handleStartAuth = useCallback(async () => {
    setAuthState('loading');
    setErrorMessage('');

    try {
      const result = await startPlatformAuthorization(platform);
      setPendingState(result.pending_state);

      // Open authorization URL in new tab
      window.open(result.authorize_url, '_blank');

      // Start polling
      setAuthState('pending');
      startPolling(result.pending_state);
    } catch (err) {
      setAuthState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to start authorization');
    }
  }, [platform, startPolling]);

  const handleDisconnect = useCallback(async () => {
    setAuthState('loading');
    try {
      await disconnectPlatform(platform);
      setAuthState('idle');
      setConnectionStatus(null);
      onStateChange?.(false);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to disconnect');
    }
  }, [platform, onStateChange]);

  const handleRetry = useCallback(() => {
    setAuthState('idle');
    setErrorMessage('');
    setPendingState(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // Render current state UI
  if (authState === 'connected') {
    return (
      <div style={{ padding: '16px', background: '#F0FDF4', borderRadius: '8px', border: '1px solid #86EFAC' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '20px' }}>✅</span>
          <span style={{ fontWeight: 600, color: '#166534' }}>已连接 {platformLabel}</span>
        </div>
        <div style={{ color: '#166534', fontSize: '14px', marginBottom: '12px' }}>
          账号：{connectionStatus?.account_label || '—'}
        </div>
        <button
          onClick={handleDisconnect}
          style={{ padding: '6px 16px', background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5', borderRadius: '6px', cursor: 'pointer' }}
        >
          断开连接
        </button>
      </div>
    );
  }

  if (authState === 'error') {
    return (
      <div style={{ padding: '16px', background: '#FEF2F2', borderRadius: '8px', border: '1px solid #FCA5A5' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '20px' }}>❌</span>
          <span style={{ fontWeight: 600, color: '#991B1B' }}>授权失败</span>
        </div>
        <div style={{ color: '#B91C1C', fontSize: '14px', marginBottom: '12px' }}>
          {errorMessage || '未知错误'}
        </div>
        <button
          onClick={handleRetry}
          style={{ padding: '6px 16px', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          重新授权
        </button>
      </div>
    );
  }

  if (authState === 'timeout') {
    return (
      <div style={{ padding: '16px', background: '#FFFBEB', borderRadius: '8px', border: '1px solid #FCD34D' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '20px' }}>⏰</span>
          <span style={{ fontWeight: 600, color: '#92400E' }}>授权超时</span>
        </div>
        <div style={{ color: '#B45309', fontSize: '14px', marginBottom: '12px' }}>
          请在弹出的页面完成授权，或网络连接不稳定。
        </div>
        <button
          onClick={handleRetry}
          style={{ padding: '6px 16px', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          重新授权
        </button>
      </div>
    );
  }

  if (authState === 'pending') {
    return (
      <div style={{ padding: '16px', background: '#EFF6FF', borderRadius: '8px', border: '1px solid #93C5FD' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span style={{ fontSize: '20px' }}>🔄</span>
          <span style={{ fontWeight: 600, color: '#1E40AF' }}>等待授权中...</span>
        </div>
        <div style={{ color: '#1D4ED8', fontSize: '14px', marginBottom: '8px' }}>
          请在弹出的页面完成 {platformLabel} 账号登录和授权
        </div>
        <div style={{ color: '#6B7280', fontSize: '12px', marginBottom: '12px' }}>
          已等待 {elapsedSeconds} 秒
        </div>
        <button
          onClick={() => { stopPolling(); setAuthState('idle'); }}
          style={{ padding: '6px 16px', background: '#E5E7EB', color: '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          取消
        </button>
      </div>
    );
  }

  // idle / loading
  return (
    <div style={{ padding: '16px', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
      <div style={{ fontWeight: 600, marginBottom: '12px' }}>连接 {platformLabel} 账号</div>
      <ol style={{ fontSize: '14px', color: '#6B7280', marginBottom: '16px', paddingLeft: '20px' }}>
        <li>点击下方「开始授权」按钮</li>
        <li>在跳转的页面登录 {platformLabel} 并点击授权</li>
        <li>授权完成后页面将自动更新状态</li>
      </ol>
      <button
        onClick={handleStartAuth}
        disabled={authState === 'loading'}
        style={{
          padding: '8px 20px',
          background: platformColor,
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: authState === 'loading' ? 'not-allowed' : 'pointer',
          opacity: authState === 'loading' ? 0.7 : 1,
          fontWeight: 600,
        }}
      >
        {authState === 'loading' ? '启动中...' : '🚀 开始授权'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify the file compiles**

```bash
cd "D:/跨境电商 (副本)/frontend"
npx tsc --noEmit components/GuidedAuthModal.tsx 2>&1 | head -10
```
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/components/GuidedAuthModal.tsx
git commit -m "feat(ui): add GuidedAuthModal component"
```

---

## Task 6: Frontend — Replace platform-connections page with guided auth

**Files:**
- Modify: `frontend/app/settings/platform-connections/page.tsx`

**Context:**
Replace the existing settings page content to use the new `GuidedAuthModal` components for both Shopee and 1688.

**Steps:**

- [ ] **Step 1: Read the current SettingsClient component**

Find `frontend/components/SettingsClient.tsx`:
```bash
grep -n "SettingsClient" "D:/跨境电商 (副本)/frontend/components/"
```
Read that file to understand the current platform connection UI.

- [ ] **Step 2: Modify the page**

The current `page.tsx` passes data to `SettingsClient`. We need to modify `SettingsClient` to use `GuidedAuthModal`. Read the SettingsClient component first, then update it to render two `GuidedAuthModal` components (one for Shopee, one for 1688) instead of whatever it currently shows for platform connections.

Replace the platform-connection part of `SettingsClient.tsx` with:

```tsx
import { GuidedAuthModal } from '@/components/GuidedAuthModal';

// Inside SettingsClient render, replace platform connection buttons with:
<div style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr 1fr' }}>
  <GuidedAuthModal
    platform="shopee"
    platformLabel="Shopee"
    platformColor="#FA594E"
    onStateChange={(connected) => {
      if (connected) refetch?.();
    }}
  />
  <GuidedAuthModal
    platform="1688"
    platformLabel="1688"
    platformColor="#FF6A00"
    onStateChange={(connected) => {
      if (connected) refetch?.();
    }}
  />
</div>
```

- [ ] **Step 3: Verify**

```bash
cd "D:/跨境电商 (副本)/frontend"
npm run build 2>&1 | tail -20
```
Expected: Build succeeds, no TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add frontend/app/settings/platform-connections/page.tsx frontend/components/SettingsClient.tsx
git commit -m "feat(ui): integrate GuidedAuthModal into settings page"
```

---

## Task 7: Integration Test — Verify full flow

**Steps:**

- [ ] **Step 1: Start backend**

```bash
cd "D:/跨境电商 (副本)/backend"
pkill -f "uvicorn" 2>/dev/null; sleep 1
venv_win/Scripts/python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &
sleep 3
```

- [ ] **Step 2: Test status endpoint**

```bash
curl -s http://localhost:8000/api/v1/platform-connections/shopee/status | python -m json.tool
```
Expected: `{"success":true,"data":{"platform":"shopee","status":"disconnected",...}}`

- [ ] **Step 3: Start frontend**

```bash
cd "D:/跨境电商 (副本)/frontend"
npm run dev &
sleep 5
```

- [ ] **Step 4: Test polling (mock)**

Simulate a pending → connected transition:
```bash
cd "D:/跨境电商 (副本)/backend"
python -c "
from app.repositories.platform_connections import save_pending_authorization
result, _ = save_pending_authorization('shopee', 'http://example.com', 'test-state-token')
print(f'Pending: status={result.status}')
"
# Then in another shell, check polling
curl -s http://localhost:8000/api/v1/platform-connections/shopee/status | python -m json.tool
```

- [ ] **Step 5: Run backend tests**

```bash
cd "D:/跨境电商 (副本)/backend"
venv_win/Scripts/python.exe -m pytest tests/ -q --tb=short 2>&1 | tail -5
```
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: guided OAuth authorization implementation complete"
```

---

## Self-Review Checklist

1. **Spec coverage:** All requirements from spec met? Yes — polling endpoint, guided UI, states covered.
2. **Placeholder scan:** No "TBD" or "TODO" in plan.
3. **Type consistency:** `ConnectionStatus.status` uses same string literals as backend `PlatformConnectionState`.
4. **No gaps:** Tasks 1-7 are sequential and complete.
