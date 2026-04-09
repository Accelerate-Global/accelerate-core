import "server-only";

import {
  listAdminAuthUsers,
  listAdminIngestionRuns,
  listAdminPipelineRuns,
  listAdminProfiles,
  listAdminRegisteredSources,
} from "@/features/admin/server";
import type {
  AdminIngestionRunRecord,
  AdminPipelineRunRecord,
  AdminRegisteredSourceRecord,
} from "@/features/admin/shared";
import { requireCurrentUserAdmin } from "@/lib/auth/server";
import type { Tables } from "@/lib/supabase/database.types";

import {
  parseDeferredPipelineMetadata,
  parseGoogleSheetsSourceConfig,
  parseIngestionRunMetadata,
  pipelineExecutionMode,
  pipelineKey,
} from "./source-config";

const normalizeSearchParam = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }

  return value?.trim() ?? "";
};

const getSelectedSourceId = (
  searchParams: Record<string, string | string[] | undefined>,
  sources: AdminRegisteredSourceRecord[]
): string | null => {
  const sourceId = normalizeSearchParam(searchParams.sourceId);

  if (sourceId && sources.some((source) => source.id === sourceId)) {
    return sourceId;
  }

  return sources[0]?.id ?? null;
};

const getSelectedRunId = <
  TRun extends {
    id: string;
  },
>(
  searchParams: Record<string, string | string[] | undefined>,
  runs: TRun[]
): string | null => {
  const runId = normalizeSearchParam(searchParams.runId);

  if (runId && runs.some((run) => run.id === runId)) {
    return runId;
  }

  return runs[0]?.id ?? null;
};

const getRequestedByDetails = ({
  authUsersById,
  profileById,
  userId,
}: {
  authUsersById: Map<string, { email?: string }>;
  profileById: Map<string, Tables<"profiles">>;
  userId: string | null;
}) => {
  if (!userId) {
    return {
      requestedByDisplayName: null,
      requestedByEmail: null,
      requestedByUserId: null,
    };
  }

  return {
    requestedByDisplayName: profileById.get(userId)?.display_name ?? null,
    requestedByEmail: authUsersById.get(userId)?.email ?? null,
    requestedByUserId: userId,
  };
};

const mapRegisteredSourceRecord = ({
  ingestionRunsBySourceId,
  pipelineRunsBySourceId,
  source,
}: {
  ingestionRunsBySourceId: Map<string, Tables<"ingestion_runs">[]>;
  pipelineRunsBySourceId: Map<string, Tables<"pipeline_runs">[]>;
  source: Tables<"registered_sources">;
}): AdminRegisteredSourceRecord => {
  const config = parseGoogleSheetsSourceConfig(source.config);
  const ingestionRuns = ingestionRunsBySourceId.get(source.id) ?? [];
  const pipelineRuns = pipelineRunsBySourceId.get(source.id) ?? [];

  return {
    connectorKind: source.connector_kind,
    createdAt: source.created_at,
    description: source.description,
    id: source.id,
    ingestionRunCount: ingestionRuns.length,
    isEnabled: source.is_enabled,
    lastIngestionRunId: ingestionRuns[0]?.id ?? null,
    lastRunAt: source.last_run_at,
    lastRunStatus: source.last_run_status,
    name: source.name,
    pipelineRunCount: pipelineRuns.length,
    range: config?.range ?? "",
    sheetName: config?.sheetName ?? "",
    slug: source.slug,
    spreadsheetId: config?.spreadsheetId ?? "",
    updatedAt: source.updated_at,
  };
};

const mapIngestionRunRecord = ({
  authUsersById,
  profileById,
  run,
  sourceById,
}: {
  authUsersById: Map<string, { email?: string }>;
  profileById: Map<string, Tables<"profiles">>;
  run: Tables<"ingestion_runs">;
  sourceById: Map<string, AdminRegisteredSourceRecord>;
}): AdminIngestionRunRecord | null => {
  const source = sourceById.get(run.source_id);

  if (!source) {
    return null;
  }

  return {
    completedAt: run.completed_at,
    createdAt: run.created_at,
    errorMessage: run.error_message,
    id: run.id,
    ...getRequestedByDetails({
      authUsersById,
      profileById,
      userId: run.requested_by,
    }),
    runKind: run.run_kind,
    sourceId: source.id,
    sourceName: source.name,
    sourceSlug: source.slug,
    startedAt: run.started_at,
    status: run.status,
  };
};

const mapPipelineRunRecord = ({
  authUsersById,
  profileById,
  run,
  sourceById,
}: {
  authUsersById: Map<string, { email?: string }>;
  profileById: Map<string, Tables<"profiles">>;
  run: Tables<"pipeline_runs">;
  sourceById: Map<string, AdminRegisteredSourceRecord>;
}): AdminPipelineRunRecord | null => {
  const source = sourceById.get(run.source_id);

  if (!source) {
    return null;
  }

  return {
    completedAt: run.completed_at,
    createdAt: run.created_at,
    errorMessage: run.error_message,
    executionMode: run.execution_mode,
    id: run.id,
    ingestionRunId: run.ingestion_run_id,
    pipelineKey: run.pipeline_key,
    ...getRequestedByDetails({
      authUsersById,
      profileById,
      userId: run.requested_by,
    }),
    sourceId: source.id,
    sourceName: source.name,
    sourceSlug: source.slug,
    startedAt: run.started_at,
    status: run.status,
  };
};

export interface AdminIngestionRunDetail {
  metadataLines: string[];
  rawRun: Tables<"ingestion_runs">;
  run: AdminIngestionRunRecord;
  sampleRows: string[][];
  sourceConfigLines: string[];
  storedHeaders: string[];
  truncatedNotes: string[];
}

export interface AdminIngestionRunsPageData {
  runs: AdminIngestionRunRecord[];
  selectedRun: AdminIngestionRunDetail | null;
  selectedRunId: string | null;
  selectedSource: AdminRegisteredSourceRecord | null;
  selectedSourceId: string | null;
  sources: AdminRegisteredSourceRecord[];
}

export interface AdminPipelineRunDetail {
  metadataLines: string[];
  rawRun: Tables<"pipeline_runs">;
  run: AdminPipelineRunRecord;
}

export interface AdminPipelineRunsPageData {
  runs: AdminPipelineRunRecord[];
  selectedRun: AdminPipelineRunDetail | null;
  selectedRunId: string | null;
}

const buildIngestionRunDetail = ({
  run,
  runRow,
}: {
  run: AdminIngestionRunRecord;
  runRow: Tables<"ingestion_runs">;
}): AdminIngestionRunDetail => {
  const metadata = parseIngestionRunMetadata(runRow.metadata);
  const sourceConfig = parseGoogleSheetsSourceConfig(
    runRow.source_config_snapshot
  );
  const truncatedNotes: string[] = [];

  if (metadata.truncated.headers) {
    truncatedNotes.push("Stored headers were capped to the first 50 columns.");
  }

  if (metadata.truncated.sampleRows) {
    truncatedNotes.push("Stored sample rows were capped to the first 10 rows.");
  }

  if (metadata.truncated.cellValues) {
    truncatedNotes.push("Long cell values were truncated to 200 characters.");
  }

  if (metadata.truncated.metadata) {
    truncatedNotes.push(
      "Sample metadata was further trimmed to stay under 32 KB."
    );
  }

  return {
    metadataLines: [
      `Read mode: ${metadata.valuesSource === "test_fixture" ? "Playwright fixture" : "Live Google Sheets API"}`,
      `Raw rows returned: ${metadata.rawRowCount.toLocaleString()}`,
      `Data rows after header: ${metadata.dataRowCount.toLocaleString()}`,
      `Detected columns: ${metadata.columnCount?.toLocaleString() ?? "Unavailable"}`,
      `Stored metadata size: ${metadata.metadataBytes?.toLocaleString() ?? "Unavailable"} bytes`,
      `Connector duration: ${metadata.connectorDurationMs?.toLocaleString() ?? "Unavailable"} ms`,
    ],
    rawRun: runRow,
    run,
    sampleRows: metadata.sampleRows,
    sourceConfigLines: [
      `Connector: ${run.sourceName} (${run.sourceSlug})`,
      `Spreadsheet ID: ${sourceConfig?.spreadsheetId ?? "Unavailable"}`,
      `Sheet: ${sourceConfig?.sheetName ?? "Unavailable"}`,
      `Range: ${sourceConfig?.range ?? "Unavailable"}`,
    ],
    storedHeaders: metadata.headers,
    truncatedNotes,
  };
};

const buildPipelineRunDetail = ({
  run,
  runRow,
}: {
  run: AdminPipelineRunRecord;
  runRow: Tables<"pipeline_runs">;
}): AdminPipelineRunDetail => {
  const metadata = parseDeferredPipelineMetadata(runRow.metadata);

  return {
    metadataLines: [
      `Pipeline key: ${run.pipelineKey}`,
      `Execution mode: ${run.executionMode}`,
      `Deferred scaffold only: ${run.executionMode === pipelineExecutionMode.deferredScaffold ? "Yes" : "No"}`,
      `Created from ingestion run: ${run.ingestionRunId ?? "Unavailable"}`,
      `Source rows observed: ${metadata?.sourceReadSummary.dataRowCount.toLocaleString() ?? "Unavailable"}`,
      `Source columns observed: ${metadata?.sourceReadSummary.columnCount?.toLocaleString() ?? "Unavailable"}`,
      metadata?.reason ??
        "Phase B stores the downstream placeholder only. No pipeline execution is implemented yet.",
    ],
    rawRun: runRow,
    run,
  };
};

export const loadAdminIngestionRunsPage = async (
  searchParams: Record<string, string | string[] | undefined>
): Promise<AdminIngestionRunsPageData> => {
  await requireCurrentUserAdmin();

  const [profiles, authUsers, rawSources, rawIngestionRuns, rawPipelineRuns] =
    await Promise.all([
      listAdminProfiles(),
      listAdminAuthUsers(),
      listAdminRegisteredSources(),
      listAdminIngestionRuns(),
      listAdminPipelineRuns(),
    ]);
  const profileById = new Map(
    profiles.map((profile) => [profile.user_id, profile] as const)
  );
  const authUsersById = new Map(
    Array.from(authUsers.usersById.entries()).map(([userId, user]) => {
      return [userId, { email: user.email }] as const;
    })
  );
  const ingestionRunsBySourceId = new Map<string, Tables<"ingestion_runs">[]>();
  const pipelineRunsBySourceId = new Map<string, Tables<"pipeline_runs">[]>();

  for (const run of rawIngestionRuns) {
    const currentRuns = ingestionRunsBySourceId.get(run.source_id) ?? [];

    currentRuns.push(run);
    ingestionRunsBySourceId.set(run.source_id, currentRuns);
  }

  for (const run of rawPipelineRuns) {
    const currentRuns = pipelineRunsBySourceId.get(run.source_id) ?? [];

    currentRuns.push(run);
    pipelineRunsBySourceId.set(run.source_id, currentRuns);
  }

  const sources = rawSources.map((source) => {
    return mapRegisteredSourceRecord({
      ingestionRunsBySourceId,
      pipelineRunsBySourceId,
      source,
    });
  });
  const sourceById = new Map(
    sources.map((source) => [source.id, source] as const)
  );
  const selectedSourceId = getSelectedSourceId(searchParams, sources);
  const selectedSource = selectedSourceId
    ? (sourceById.get(selectedSourceId) ?? null)
    : null;
  const runs = rawIngestionRuns
    .map((run) => {
      return mapIngestionRunRecord({
        authUsersById,
        profileById,
        run,
        sourceById,
      });
    })
    .filter((run): run is AdminIngestionRunRecord => Boolean(run))
    .filter((run) => {
      if (!selectedSourceId) {
        return true;
      }

      return run.sourceId === selectedSourceId;
    });
  const rawRunById = new Map(
    rawIngestionRuns.map((run) => [run.id, run] as const)
  );
  const selectedRunId = getSelectedRunId(searchParams, runs);
  const selectedRunRecord = selectedRunId
    ? (runs.find((run) => run.id === selectedRunId) ?? null)
    : null;
  const selectedRawRun = selectedRunRecord
    ? (rawRunById.get(selectedRunRecord.id) ?? null)
    : null;
  const selectedRun =
    selectedRunRecord && selectedRawRun
      ? buildIngestionRunDetail({
          run: selectedRunRecord,
          runRow: selectedRawRun,
        })
      : null;

  return {
    runs,
    selectedRun,
    selectedRunId,
    selectedSource,
    selectedSourceId,
    sources,
  };
};

export const loadAdminPipelineRunsPage = async (
  searchParams: Record<string, string | string[] | undefined>
): Promise<AdminPipelineRunsPageData> => {
  await requireCurrentUserAdmin();

  const [profiles, authUsers, rawSources, rawPipelineRuns] = await Promise.all([
    listAdminProfiles(),
    listAdminAuthUsers(),
    listAdminRegisteredSources(),
    listAdminPipelineRuns(),
  ]);
  const profileById = new Map(
    profiles.map((profile) => [profile.user_id, profile] as const)
  );
  const authUsersById = new Map(
    Array.from(authUsers.usersById.entries()).map(([userId, user]) => {
      return [userId, { email: user.email }] as const;
    })
  );
  const sources = rawSources.map((source) => {
    return mapRegisteredSourceRecord({
      ingestionRunsBySourceId: new Map(),
      pipelineRunsBySourceId: new Map(),
      source,
    });
  });
  const sourceById = new Map(
    sources.map((source) => [source.id, source] as const)
  );
  const requestedSourceId = normalizeSearchParam(searchParams.sourceId);
  const runs = rawPipelineRuns
    .map((run) => {
      return mapPipelineRunRecord({
        authUsersById,
        profileById,
        run,
        sourceById,
      });
    })
    .filter((run): run is AdminPipelineRunRecord => Boolean(run))
    .filter((run) => {
      if (!requestedSourceId) {
        return true;
      }

      return run.sourceId === requestedSourceId;
    });
  const rawRunById = new Map(
    rawPipelineRuns.map((run) => [run.id, run] as const)
  );
  const selectedRunId = getSelectedRunId(searchParams, runs);
  const selectedRunRecord = selectedRunId
    ? (runs.find((run) => run.id === selectedRunId) ?? null)
    : null;
  const selectedRawRun = selectedRunRecord
    ? (rawRunById.get(selectedRunRecord.id) ?? null)
    : null;
  const selectedRun =
    selectedRunRecord && selectedRawRun
      ? buildPipelineRunDetail({
          run: selectedRunRecord,
          runRow: selectedRawRun,
        })
      : null;

  return {
    runs,
    selectedRun,
    selectedRunId,
  };
};

export const isDeferredPipelineRun = (run: AdminPipelineRunRecord): boolean => {
  return (
    run.executionMode === pipelineExecutionMode.deferredScaffold &&
    run.pipelineKey === pipelineKey.sourceIngestionScaffold
  );
};
