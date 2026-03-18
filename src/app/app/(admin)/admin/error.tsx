"use client";

import { ErrorState } from "@/components/feedback/error-state";

interface AdminErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminError({ error, reset }: AdminErrorProps) {
  return (
    <ErrorState
      description="The admin section hit an unexpected problem. Retry this view or move back to another area when navigation is ready."
      error={error}
      reset={reset}
      title="Admin view error"
    />
  );
}
