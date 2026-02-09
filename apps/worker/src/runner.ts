import { Storage } from "@google-cloud/storage";

import { createConnectorRegistry } from "@accelerate-core/connectors";
import { connector as joshuaProjectPgicConnector } from "@accelerate-core/connector-joshuaproject";
import {
  acquireRunLease,
  createDatasetVersion,
  ensureDataset,
  getRunById,
  reserveNextDatasetVersion,
  updateRun,
  upsertConnector
} from "@accelerate-core/firestore";
import { loadNdjsonFromGcsToTable } from "@accelerate-core/bq";
import { DATASET_IDS, formatVersionedTableId, PROJECT_IDS } from "@accelerate-core/shared";

type WritableLike = {
  write: (chunk: string) => boolean;
  end: () => void;
  once: (event: "drain" | "finish" | "error", cb: (...args: unknown[]) => void) => void;
};

function getArtifactsBucket(): string {
  return process.env.ARTIFACTS_BUCKET ?? PROJECT_IDS.artifactsBucketDefault;
}

function getBigQueryDataset(): string {
  return process.env.BIGQUERY_DATASET ?? PROJECT_IDS.bigQueryDataset;
}

function getBigQueryLocation(): string {
  return process.env.BIGQUERY_LOCATION ?? "US";
}

function sanitizeKeyForBigQuery(key: string): string {
  // BigQuery field names: letters/numbers/underscore, must start with letter or underscore.
  let out = key.replace(/[^A-Za-z0-9_]/g, "_");
  if (!/^[A-Za-z_]/.test(out)) out = `_${out}`;
  if (out.length > 128) out = out.slice(0, 128);
  return out;
}

function sanitizeValueForBigQuery(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeValueForBigQuery);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    const used = new Set<string>();
    for (const [k, v] of Object.entries(obj)) {
      let sk = sanitizeKeyForBigQuery(k);
      if (!sk) sk = "_";
      if (used.has(sk)) {
        let i = 2;
        while (used.has(`${sk}_${i}`)) i += 1;
        sk = `${sk}_${i}`;
      }
      used.add(sk);
      next[sk] = sanitizeValueForBigQuery(v);
    }
    return next;
  }
  return value;
}

async function writeLine(stream: WritableLike, line: string): Promise<void> {
  if (stream.write(line)) return;
  await new Promise<void>((resolve, reject) => {
    stream.once("drain", () => resolve());
    stream.once("error", (err) => reject(err));
  });
}

export async function runConnectorForRun(runId: string): Promise<{ ok: boolean; message: string }> {
  console.log(`[worker] run=${runId} starting`);
  const ownerId =
    process.env.WORKER_INSTANCE_ID ??
    process.env.K_REVISION ??
    `local-${Math.random().toString(16).slice(2)}`;

  const lease = await acquireRunLease({
    runId,
    ownerId,
    ttlMs: 20 * 60 * 1000
  });

  if (!lease.acquired) {
    console.log(`[worker] run=${runId} lease not acquired (already processing elsewhere)`);
    return { ok: false, message: "Run is already leased by another worker" };
  }

  try {
    const run = await getRunById(runId);
    if (!run) return { ok: false, message: "Run not found" };

    if (run.status === "succeeded") return { ok: true, message: "Run already succeeded" };

    const connectorId = run.connectorId;
    const datasetId = run.datasetId;

    if (!connectorId) return { ok: false, message: "Run missing connectorId" };
    if (!datasetId) return { ok: false, message: "Run missing datasetId" };

    console.log(`[worker] run=${runId} connector=${connectorId} dataset=${datasetId}`);

    const startedAt = new Date().toISOString();
    await updateRun(runId, { status: "running", startedAt });

    // Ensure dataset + connector records exist for UI/control-plane.
    await upsertConnector({
      id: joshuaProjectPgicConnector.id,
      displayName: joshuaProjectPgicConnector.displayName,
      description: joshuaProjectPgicConnector.description
    });

    if (datasetId === DATASET_IDS.pgicPeopleGroups) {
      await ensureDataset({
        id: datasetId,
        displayName: "PGIC People Groups",
        description: "Joshua Project people group data (PGIC)"
      });
    } else {
      await ensureDataset({ id: datasetId, displayName: datasetId });
    }

    // Execute connector and write raw NDJSON to GCS.
    const registry = createConnectorRegistry();
    registry.register(joshuaProjectPgicConnector);

    const connector = registry.get(connectorId);
    if (!connector) return { ok: false, message: `Unknown connector: ${connectorId}` };

    console.log(`[worker] run=${runId} executing connector`);
    const result = await connector.run({ runId, datasetId });
    if (!result.ok) throw new Error(result.message);

    const records = result.output?.records;
    if (!records) throw new Error("Connector returned no records stream");

    const bucketName = getArtifactsBucket();
    const rawNdjsonPath = `raw/${connectorId}/${runId}/${datasetId}.ndjson`;
    const gcsUri = `gs://${bucketName}/${rawNdjsonPath}`;

    console.log(`[worker] run=${runId} writing raw NDJSON to ${gcsUri}`);
    const storage = new Storage({ projectId: process.env.GOOGLE_CLOUD_PROJECT ?? PROJECT_IDS.gcpProjectId });
    const file = storage.bucket(bucketName).file(rawNdjsonPath);

    const stream = file.createWriteStream({
      resumable: false,
      contentType: "application/x-ndjson"
    }) as unknown as WritableLike;

    let rowCount = 0;

    const finishedWrite = new Promise<void>((resolve, reject) => {
      stream.once("finish", () => resolve());
      stream.once("error", (err) => reject(err));
    });

    for await (const record of records) {
      const sanitized = sanitizeValueForBigQuery(record) as Record<string, unknown>;
      await writeLine(stream, `${JSON.stringify(sanitized)}\n`);
      rowCount += 1;
    }

    stream.end();
    await finishedWrite;

    console.log(`[worker] run=${runId} wrote ${rowCount} rows`);
    await updateRun(runId, { outputs: { gcsRawNdjsonPath: rawNdjsonPath } });

    // Reserve the next dataset version number and load into BigQuery table-per-version.
    const reservation = await reserveNextDatasetVersion({ datasetId });
    const tableId = formatVersionedTableId(datasetId, reservation.versionNumber);

    console.log(
      `[worker] run=${runId} reserved datasetVersion=${reservation.versionId} table=${getBigQueryDataset()}.${tableId}`
    );
    await loadNdjsonFromGcsToTable({
      datasetId: getBigQueryDataset(),
      tableId,
      gcsUri
    });

    console.log(`[worker] run=${runId} loaded into BigQuery`);
    await createDatasetVersion({
      datasetId,
      versionId: reservation.versionId,
      versionNumber: reservation.versionNumber,
      runId,
      connectorId,
      rowCount,
      bigQuery: {
        projectId: PROJECT_IDS.gcpProjectId,
        datasetId: getBigQueryDataset(),
        tableId,
        location: getBigQueryLocation()
      },
      gcs: {
        bucket: bucketName,
        rawNdjsonPath
      }
    });

    const finishedAt = new Date().toISOString();
    await updateRun(runId, {
      status: "succeeded",
      finishedAt,
      outputs: {
        datasetVersionId: reservation.versionId,
        bigQueryTableId: tableId,
        gcsRawNdjsonPath: rawNdjsonPath
      }
    });

    console.log(`[worker] run=${runId} succeeded`);
    return { ok: true, message: "Succeeded" };
  } catch (err) {
    const finishedAt = new Date().toISOString();
    await updateRun(runId, {
      status: "failed",
      finishedAt,
      error: { message: err instanceof Error ? err.message : "Unknown error" }
    });
    console.log(`[worker] run=${runId} failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    return { ok: false, message: err instanceof Error ? err.message : "Unknown error" };
  } finally {
    await lease.release();
    console.log(`[worker] run=${runId} lease released`);
  }
}
