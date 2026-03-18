"use client";

import { ErrorState } from "@/components/feedback/error-state";

interface RootErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootError({ error, reset }: RootErrorProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30 p-6">
      <ErrorState
        description="The app hit an unexpected problem while loading this page."
        error={error}
        reset={reset}
      />
    </main>
  );
}
