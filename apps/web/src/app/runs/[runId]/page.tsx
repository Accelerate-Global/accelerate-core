import { RunDetailsClient } from "./run-details-client";

export default async function RunDetailPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;

  return (
    <div className="card">
      <h1>Run</h1>
      <p className="pill">
        Run ID: <code>{runId}</code>
      </p>
      <RunDetailsClient runId={runId} />
    </div>
  );
}
