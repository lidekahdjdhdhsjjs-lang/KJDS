'use client';

import { ErrorCard } from '@/components/ErrorCard';

export default function BatchDetailError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorCard
      title="Batch Detail Error"
      description="Something went wrong while loading the batch detail."
      {...props}
    />
  );
}
