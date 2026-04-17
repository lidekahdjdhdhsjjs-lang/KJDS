'use client';

import { ErrorCard } from '@/components/ErrorCard';

export default function TrainingArchiveError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorCard
      title="Training Archive Error"
      description="Something went wrong while loading the training archive."
      {...props}
    />
  );
}
