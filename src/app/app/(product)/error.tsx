"use client";

import { ErrorState } from "@/components/feedback/error-state";

interface ProductErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ProductError({ error, reset }: ProductErrorProps) {
  return (
    <ErrorState
      description="The product view could not finish rendering. You can retry or navigate somewhere else once shared navigation ships."
      error={error}
      reset={reset}
      title="Product view error"
    />
  );
}
