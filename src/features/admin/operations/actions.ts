"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  type AdminActionState,
  createInitialAdminActionState,
} from "@/features/admin/shared";
import { normalizeJsonRecord } from "@/features/datasets/types";
import { requireCurrentUserAdmin } from "@/lib/auth/server";
import { routes } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json, Tables } from "@/lib/supabase/database.types";

import { readGoogleSheetValues } from "./google-sheets";
import {
  ingestionRunKind,
  parseGoogleSheetsSourceConfig,
  pipelineExecutionMode,
  pipelineKey,
  registeredSourceConnectorKind,
  registeredSourceFormSchema,
  sourceReadBounds,
} from "./source-config";

const toErrorMessage = (message: string, cause?: string): string => {
  if (!cause) {
    return message;
  }

  return `${message}: ${cause}`;
};

const getIngestionRunsHref = (sourceId?: string, runId?: string): string => {
  const params = new URLSearchParams();

  if (sourceId) {
    params.set("sourceId", sourceId);
  }

  if (runId) {
    params.set("runId", runId);
  }

  const query = params.toString();

  return query
    ? `${routes.adminIngestionRuns}?${query}`
    : routes.adminIngestionRuns;
};

const revalidateOperationsPaths = (): void => {
  revalidatePath(routes.adminHome);
  revalidatePath(routes.adminIngestionRuns);
  revalidatePath(routes.adminPipelineRuns);
  revalidatePath(routes.adminPublishing);
};

const createBaseSlug = (value: string): string => {
  const normalizedSlug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return normalizedSlug || "source";
};

const createUniqueSourceSlug = async (name: string): Promise<string> => {
  const supabase = createAdminClient();
  const baseSlug = createBaseSlug(name);
  let nextSlug = baseSlug;
  let suffix = 2;

  for (;;) {
    const { data, error } = await supabase
      .from("registered_sources")
      .select("id")
      .eq("slug", nextSlug)
      .maybeSingle();

    if (error) {
      throw new Error(
        toErrorMessage("Failed to inspect existing source slugs", error.message)
      );
    }

    if (!data) {
      return nextSlug;
    }

    nextSlug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
};

const truncateStoredCell = (
  value: string
): { value: string; wasTruncated: boolean } => {
  if (value.length <= sourceReadBounds.maxStoredCellLength) {
    return {
      value,
      wasTruncated: false,
    };
  }

  return {
    value: `${value.slice(0, sourceReadBounds.maxStoredCellLength - 1)}...`,
    wasTruncated: true,
  };
};

const buildSourceConfigSnapshot = (
  source: Pick<Tables<"registered_sources">, "config" | "connector_kind">
): Record<string, Json> => {
  return {
    ...normalizeJsonRecord(source.config),
    connectorKind: source.connector_kind,
  };
};

const buildIngestionRunMetadata = (
  values: string[][],
  durationMs: number,
  valuesSource: "google_api" | "test_fixture"
) => {
  const rawRowCount = values.length;
  const fullColumnCount = values.reduce((maxColumnCount, row) => {
    return Math.max(maxColumnCount, row.length);
  }, 0);
  const storedColumnCount = Math.min(
    fullColumnCount,
    sourceReadBounds.maxHeaderCount
  );
  const dataRowCount = Math.max(rawRowCount - 1, 0);
  let cellValuesTruncated = false;

  const headers = (values[0] ?? [])
    .slice(0, storedColumnCount)
    .map((value, index) => {
      const truncatedValue = truncateStoredCell(value.trim());

      if (truncatedValue.wasTruncated) {
        cellValuesTruncated = true;
      }

      return truncatedValue.value || `Column ${index + 1}`;
    });

  let sampleRows = values
    .slice(1, sourceReadBounds.maxSampleRows + 1)
    .map((row) => {
      return row.slice(0, storedColumnCount).map((value) => {
        const truncatedValue = truncateStoredCell(value);

        if (truncatedValue.wasTruncated) {
          cellValuesTruncated = true;
        }

        return truncatedValue.value;
      });
    });
  let metadataTruncated = false;
  const headersTruncated = fullColumnCount > headers.length;
  const sampleRowsTruncated = dataRowCount > sampleRows.length;

  let metadata = {
    columnCount: fullColumnCount,
    connectorDurationMs: Math.max(0, Math.round(durationMs)),
    dataRowCount,
    headers,
    metadataBytes: 0,
    rawRowCount,
    sampleRows,
    truncated: {
      cellValues: cellValuesTruncated,
      headers: headersTruncated,
      metadata: false,
      sampleRows: sampleRowsTruncated,
    },
    valuesSource,
  };

  let metadataBytes = Buffer.byteLength(JSON.stringify(metadata), "utf8");

  while (
    metadataBytes > sourceReadBounds.maxMetadataBytes &&
    sampleRows.length > 0
  ) {
    sampleRows = sampleRows.slice(0, -1);
    metadataTruncated = true;
    metadata = {
      ...metadata,
      sampleRows,
      truncated: {
        ...metadata.truncated,
        metadata: true,
        sampleRows: true,
      },
    };
    metadataBytes = Buffer.byteLength(JSON.stringify(metadata), "utf8");
  }

  return {
    ...metadata,
    metadataBytes,
    truncated: {
      ...metadata.truncated,
      metadata: metadataTruncated,
    },
  };
};

const createDeferredPipelineRun = async ({
  actingUserId,
  ingestionRunId,
  metadata,
  source,
}: {
  actingUserId: string;
  ingestionRunId: string;
  metadata: {
    columnCount: number;
    dataRowCount: number;
    valuesSource: "google_api" | "test_fixture";
  };
  source: Pick<Tables<"registered_sources">, "id">;
}): Promise<string> => {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pipeline_runs")
    .insert({
      execution_mode: pipelineExecutionMode.deferredScaffold,
      ingestion_run_id: ingestionRunId,
      metadata: {
        deferred: true,
        executionMode: pipelineExecutionMode.deferredScaffold,
        ingestionRunId,
        reason:
          "Phase B stores durable downstream placeholders only. No pipeline execution is implemented yet.",
        sourceReadSummary: metadata,
      },
      pipeline_key: pipelineKey.sourceIngestionScaffold,
      requested_by: actingUserId,
      source_id: source.id,
      status: "queued",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(
      toErrorMessage(
        "Failed to create the deferred pipeline run",
        error.message
      )
    );
  }

  return data.id;
};

export const saveRegisteredSourceAction = async (
  _previousState: AdminActionState<{ sourceId: string }>,
  formData: FormData
): Promise<AdminActionState<{ sourceId: string }>> => {
  const initialState = createInitialAdminActionState<{ sourceId: string }>();
  const actingUser = await requireCurrentUserAdmin();
  const parsedForm = registeredSourceFormSchema.safeParse({
    connectorKind: formData.get("connectorKind"),
    description: formData.get("description"),
    isEnabled: formData.get("isEnabled") === "true",
    name: formData.get("name"),
    range: formData.get("range"),
    sheetName: formData.get("sheetName"),
    sourceId: formData.get("sourceId"),
    spreadsheetId: formData.get("spreadsheetId"),
  });

  if (!parsedForm.success) {
    return {
      ...initialState,
      message:
        parsedForm.error.issues[0]?.message ?? "Source details are invalid.",
      status: "error",
    };
  }

  const supabase = createAdminClient();
  const payload = {
    config: {
      range: parsedForm.data.range,
      sheetName: parsedForm.data.sheetName,
      spreadsheetId: parsedForm.data.spreadsheetId,
    },
    connector_kind: registeredSourceConnectorKind.googleSheets,
    description: parsedForm.data.description,
    is_enabled: parsedForm.data.isEnabled,
    name: parsedForm.data.name,
  } as const;

  if (parsedForm.data.sourceId) {
    const { error } = await supabase
      .from("registered_sources")
      .update(payload)
      .eq("id", parsedForm.data.sourceId);

    if (error) {
      return {
        ...initialState,
        message: toErrorMessage("Failed to update the source", error.message),
        status: "error",
      };
    }

    revalidateOperationsPaths();
    redirect(getIngestionRunsHref(parsedForm.data.sourceId));
  }

  const slug = await createUniqueSourceSlug(parsedForm.data.name);
  const { data, error } = await supabase
    .from("registered_sources")
    .insert({
      ...payload,
      created_by: actingUser.id,
      slug,
    })
    .select("id")
    .single();

  if (error) {
    return {
      ...initialState,
      message: toErrorMessage("Failed to create the source", error.message),
      status: "error",
    };
  }

  revalidateOperationsPaths();
  redirect(getIngestionRunsHref(data.id));
};

export const toggleRegisteredSourceEnabledAction = async (
  formData: FormData
): Promise<void> => {
  await requireCurrentUserAdmin();
  const sourceId = formData.get("sourceId");
  const nextEnabled = formData.get("nextEnabled");

  if (typeof sourceId !== "string" || !sourceId) {
    throw new Error("A source id is required.");
  }

  if (nextEnabled !== "true" && nextEnabled !== "false") {
    throw new Error("A valid source enabled state is required.");
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("registered_sources")
    .update({
      is_enabled: nextEnabled === "true",
    })
    .eq("id", sourceId);

  if (error) {
    throw new Error(
      toErrorMessage("Failed to update the source state", error.message)
    );
  }

  revalidateOperationsPaths();
  redirect(getIngestionRunsHref(sourceId));
};

export const triggerRegisteredSourceReadAction = async (
  formData: FormData
): Promise<void> => {
  const actingUser = await requireCurrentUserAdmin();
  const sourceId = formData.get("sourceId");

  if (typeof sourceId !== "string" || !sourceId) {
    throw new Error("A source id is required.");
  }

  const supabase = createAdminClient();
  const { data: source, error: sourceError } = await supabase
    .from("registered_sources")
    .select(
      "id, slug, name, connector_kind, is_enabled, config, last_run_at, last_run_status"
    )
    .eq("id", sourceId)
    .maybeSingle();

  if (sourceError) {
    throw new Error(
      toErrorMessage("Failed to load the source", sourceError.message)
    );
  }

  if (!source) {
    throw new Error("The selected source could not be found.");
  }

  if (!source.is_enabled) {
    throw new Error("Disabled sources cannot be triggered.");
  }

  const sourceConfigSnapshot = buildSourceConfigSnapshot(source);
  const { data: createdRun, error: createRunError } = await supabase
    .from("ingestion_runs")
    .insert({
      metadata: {},
      requested_by: actingUser.id,
      run_kind: ingestionRunKind.sourceRead,
      source_config_snapshot: sourceConfigSnapshot,
      source_id: source.id,
      status: "queued",
    })
    .select("id")
    .single();

  if (createRunError) {
    throw new Error(
      toErrorMessage(
        "Failed to create the ingestion run",
        createRunError.message
      )
    );
  }

  const runId = createdRun.id;
  const startedAt = new Date().toISOString();

  const markRunFailed = async (message: string): Promise<void> => {
    const completedAt = new Date().toISOString();
    const { error: runUpdateError } = await supabase
      .from("ingestion_runs")
      .update({
        completed_at: completedAt,
        error_message: message,
        started_at: startedAt,
        status: "failed",
      })
      .eq("id", runId);

    if (runUpdateError) {
      throw new Error(
        toErrorMessage(
          "Failed to mark the ingestion run as failed",
          runUpdateError.message
        )
      );
    }

    const { error: sourceUpdateError } = await supabase
      .from("registered_sources")
      .update({
        last_run_at: completedAt,
        last_run_status: "failed",
      })
      .eq("id", source.id);

    if (sourceUpdateError) {
      throw new Error(
        toErrorMessage(
          "Failed to update source run status",
          sourceUpdateError.message
        )
      );
    }
  };

  const { error: runningError } = await supabase
    .from("ingestion_runs")
    .update({
      started_at: startedAt,
      status: "running",
    })
    .eq("id", runId);

  if (runningError) {
    throw new Error(
      toErrorMessage("Failed to start the ingestion run", runningError.message)
    );
  }

  try {
    const sourceConfig = parseGoogleSheetsSourceConfig(source.config);

    if (!sourceConfig) {
      throw new Error("The registered source configuration is invalid.");
    }

    const readResult = await readGoogleSheetValues(sourceConfig);
    const metadata = buildIngestionRunMetadata(
      readResult.values,
      readResult.durationMs,
      readResult.valuesSource
    );
    const completedAt = new Date().toISOString();
    const { error: completeRunError } = await supabase
      .from("ingestion_runs")
      .update({
        completed_at: completedAt,
        error_message: null,
        metadata,
        started_at: startedAt,
        status: "succeeded",
      })
      .eq("id", runId);

    if (completeRunError) {
      throw new Error(
        toErrorMessage(
          "Failed to complete the ingestion run",
          completeRunError.message
        )
      );
    }

    const { error: sourceUpdateError } = await supabase
      .from("registered_sources")
      .update({
        last_run_at: completedAt,
        last_run_status: "succeeded",
      })
      .eq("id", source.id);

    if (sourceUpdateError) {
      throw new Error(
        toErrorMessage(
          "Failed to update source run status",
          sourceUpdateError.message
        )
      );
    }

    await createDeferredPipelineRun({
      actingUserId: actingUser.id,
      ingestionRunId: runId,
      metadata: {
        columnCount: metadata.columnCount,
        dataRowCount: metadata.dataRowCount,
        valuesSource: metadata.valuesSource,
      },
      source,
    });
  } catch (error) {
    await markRunFailed(
      error instanceof Error
        ? error.message
        : "An unexpected source-read error occurred."
    );
  }

  revalidateOperationsPaths();
  redirect(getIngestionRunsHref(source.id, runId));
};
