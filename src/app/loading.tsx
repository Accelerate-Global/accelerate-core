import { LoadingState } from "@/components/feedback/loading-state";

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30 p-6">
      <LoadingState />
    </main>
  );
}
