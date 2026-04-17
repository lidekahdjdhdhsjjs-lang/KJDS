'use client';

import { ErrorCard } from '@/components/ErrorCard';

export default function ProcurementDraftsError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorCard
      title="Procurement Drafts Error"
      description="Something went wrong while loading the procurement drafts."
      {...props}
    />
  );
}
