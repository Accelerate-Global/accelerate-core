"use client";

import { ErrorState } from "@/components/feedback/error-state";

interface ProductErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ProductError({ error, reset }: ProductErrorProps) {
  return (
    <ErrorState
      description="The dataset product view could not finish rendering. Retry the page or return to the dataset directory."
      error={error}
      reset={reset}
      title="Product view error"
    />
  );
}
