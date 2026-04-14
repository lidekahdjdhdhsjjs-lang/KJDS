# Frontend Architecture

This document describes the frontend architecture for the Shopee AI Ops cross-border e-commerce system.

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **React**: React 19
- **Styling**: Inline styles with design tokens
- **Testing**: Jest + Playwright E2E

## Project Structure

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout with navigation
│   ├── page.tsx            # Home page
│   ├── dashboard/          # Operator dashboard
│   ├── batches/            # Batch management
│   ├── opportunities/      # Opportunity items
│   ├── exceptions/         # Exceptions center
│   ├── agent-runs/         # Agent run tracking
│   ├── training-archive/   # Training packages
│   ├── procurement/        # Procurement drafts
│   └── settings/           # Platform connections
├── components/             # React components
│   ├── Navigation.tsx      # Global navigation
│   ├── DashboardClient.tsx # Dashboard client component
│   ├── BatchesClient.tsx   # Batches client component
│   ├── BatchDetailClient.tsx # Batch detail client
│   ├── OpportunityDetailClient.tsx # Item detail client
│   └── ExceptionsClient.tsx # Exceptions center client
├── lib/                    # Utilities
│   └── api.ts              # API client functions
└── e2e/                    # Playwright E2E tests
    └── sprint2.spec.ts     # Sprint 2 E2E tests
```

## Pages

### Home (`/`)
Landing page with navigation to main features.

### Dashboard (`/dashboard`)
Operator dashboard with:
- Summary statistics
- Draft management
- Platform authorization status
- Quick navigation cards

### Batches (`/batches`)
Batch management with:
- Batch list
- Create new batch
- Status filtering

### Batch Detail (`/batches/[id]`)
Batch detail view with:
- Batch information
- Stage overview
- Items list
- Batch operations (start, pause, resume, complete)

### Opportunity Detail (`/opportunities/[id]`)
Item detail view with:
- Item information
- Supply candidates
- Category mappings
- Content variants
- Pricing decisions
- Preflight checks

### Exceptions (`/exceptions`)
Exceptions center with:
- Incidents list
- Blocked tasks
- Store health status
- Tab navigation

### Agent Runs (`/agent-runs`)
Agent run tracking with:
- Summary statistics
- Filter controls
- Run list

### Training Archive (`/training-archive`)
Training packages with:
- Package list
- Filter controls

### Procurement (`/procurement`)
Procurement drafts with:
- Draft list
- Status filtering

### Settings (`/settings/platform-connections`)
Platform connection management with:
- OAuth authorization flow
- Connection status
- Disconnect functionality

## API Client (`lib/api.ts`)

### Types

```typescript
// API Response envelope
export type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: string | null;
  meta: Record<string, unknown> | null;
};

// Operator roles
export type OperatorRole = 'operator' | 'reviewer' | 'admin';

// Platform connection status
export type PlatformConnectionStatus = {
  platform: 'shopee' | '1688';
  connected: boolean;
  status: 'disconnected' | 'pending' | 'connected' | 'error';
  // ...
};
```

### API Functions

```typescript
// Dashboard
fetchDashboardSummary(actor?: ActingOperator): Promise<DashboardSummary>
fetchDashboardAuthorization(actor?: ActingOperator): Promise<PlatformAuthorizationStatus>

// Platform connections
fetchPlatformConnections(actor?: ActingOperator): Promise<PlatformConnectionsSummary>
startPlatformAuthorization(platform: 'shopee' | '1688', actor?: ActingOperator): Promise<...>
disconnectPlatform(platform: 'shopee' | '1688', actor?: ActingOperator): Promise<...>

// Batches
fetchBatches(): Promise<BatchList>
createBatch(storeId: string, triggerType?: string): Promise<Batch>
startBatch(batchId: string): Promise<Batch>
pauseBatch(batchId: string): Promise<Batch>
// ...

// Opportunity items
fetchItems(batchId?: string): Promise<ItemList>
fetchItemDetail(itemId: string): Promise<ItemDetail>
advanceItemStatus(itemId: string, status: string): Promise<OpportunityItem>

// Feedback
fetchFeedbackRecords(...): Promise<FeedbackRecord[]>
createFeedbackRecord(body: {...}): Promise<FeedbackRecord>
approveFeedbackRecord(feedbackId: string): Promise<...>
rejectFeedbackRecord(feedbackId: string): Promise<...>

// Demand signals
fetchDemandSignals(opportunityItemId: string): Promise<DemandSignalSnapshot[]>

// Training packages
fetchTrainingPackages(...): Promise<TrainingArchivePackage[]>
```

## Design Tokens

Colors follow a consistent palette:

```typescript
// Primary
--color-primary: #2563eb;     // Blue
--color-success: #22c55e;     // Green
--color-warning: #f97316;     // Orange
--color-error: #dc2626;       // Red

// Neutrals
--color-text: #0f172a;
--color-text-secondary: #64748b;
--color-background: #f8fafc;
--color-surface: #ffffff;
--color-border: #e2e8f0;
```

## Component Patterns

### Client Components

All interactive components use `'use client'` directive:

```tsx
'use client';

import { useEffect, useState } from 'react';

export function MyComponent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;

  return <div>{/* render data */}</div>;
}
```

### Loading States

```tsx
if (loading) {
  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <p>Loading...</p>
    </div>
  );
}
```

### Error Handling

```tsx
{error && (
  <div style={{
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#b91c1c',
  }}>
    {error}
  </div>
)}
```

### Empty States

```tsx
{items.length === 0 ? (
  <div style={{
    padding: 40,
    textAlign: 'center',
    borderRadius: 12,
    backgroundColor: '#fff',
    border: '1px dashed #cbd5e1',
    color: '#64748b',
  }}>
    No items found.
  </div>
) : (
  items.map(item => <ItemCard key={item.id} item={item} />)
)}
```

## Testing

### Unit Tests

Located in `__tests__/` directories or `.test.tsx` files.

### E2E Tests

Located in `e2e/` directory using Playwright.

Run E2E tests:

```bash
npx playwright test e2e/sprint2.spec.ts --reporter=list
```

Key test suites:
- Batch Management
- Batch Detail Page
- Opportunity Detail Page
- Exceptions Center
- Navigation
- Error Handling
- API Health

## Build

Production build:

```bash
npm run build
```

Development server:

```bash
npm run dev
```

## Environment Variables

```bash
NEXT_PUBLIC_API_BASE=http://localhost:8000/api/v1
```
