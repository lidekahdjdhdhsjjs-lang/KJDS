'use client';

import { ErrorCard } from '@/components/ErrorCard';

export default function ExceptionsError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorCard
      title="Exceptions Center Error"
      description="Something went wrong while loading the exceptions center."
      {...props}
    />
  );
}
