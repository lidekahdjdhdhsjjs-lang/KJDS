'use client';

import { ErrorCard } from '@/components/ErrorCard';

export default function OpportunitiesError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorCard
      title="Opportunities Error"
      description="Something went wrong while loading the opportunities."
      {...props}
    />
  );
}
