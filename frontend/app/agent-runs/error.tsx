'use client';

import { ErrorCard } from '@/components/ErrorCard';

export default function AgentRunsError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorCard
      title="Agent Runs Error"
      description="Something went wrong while loading the agent runs."
      {...props}
    />
  );
}
