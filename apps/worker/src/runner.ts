import { createConnectorRegistry } from "@accelerate-core/connectors";
import { connector as joshuaProjectConnector } from "@accelerate-core/connector-joshuaproject";
import { acquireRunLease, getRunById, setRunStatus } from "@accelerate-core/firestore";

export async function runConnectorForRun(runId: string): Promise<{ ok: boolean; message: string }> {
  const ownerId =
    process.env.WORKER_INSTANCE_ID ??
    process.env.K_REVISION ??
    `local-${Math.random().toString(16).slice(2)}`;

  const lease = await acquireRunLease({
    runId,
    ownerId,
    ttlMs: 10 * 60 * 1000
  });

  if (!lease.acquired) {
    return { ok: false, message: "Run is already leased by another worker" };
  }

  try {
    const run = await getRunById(runId);
    if (!run) return { ok: false, message: "Run not found" };

    const connectorKey = run.connectorKey;
    if (!connectorKey) return { ok: false, message: "Run missing connectorKey" };

    const registry = createConnectorRegistry();
    registry.register(joshuaProjectConnector);

    const connector = registry.get(connectorKey);
    if (!connector) return { ok: false, message: `Unknown connector: ${connectorKey}` };

    await setRunStatus(runId, "running");

    const result = await connector.run({
      runId,
      datasetSlug: run.datasetSlug
    });

    if (result.ok) {
      await setRunStatus(runId, "succeeded");
      return { ok: true, message: result.message ?? "Succeeded" };
    }

    await setRunStatus(runId, "failed");
    return { ok: false, message: result.message };
  } catch (err) {
    await setRunStatus(runId, "failed");
    return { ok: false, message: err instanceof Error ? err.message : "Unknown error" };
  } finally {
    await lease.release();
  }
}

