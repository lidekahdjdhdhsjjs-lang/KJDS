'use client';

import { ErrorCard } from '@/components/ErrorCard';

export default function OpportunityDetailError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorCard
      title="Opportunity Detail Error"
      description="Something went wrong while loading the opportunity detail."
      {...props}
    />
  );
}
