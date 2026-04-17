'use client';

import { ErrorCard } from '@/components/ErrorCard';

export default function BatchesError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorCard
      title="Batch Dashboard Error"
      description="Something went wrong while loading the batch dashboard."
      {...props}
    />
  );
}
