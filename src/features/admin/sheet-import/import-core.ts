import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { sourceReadBounds } from "@/features/admin/operations/source-config";
import { datasetColumnKind } from "@/features/datasets/types";
import { routes } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

export const toErrorMessage = (message: string, cause?: string): string => {
  if (!cause) {
    return message;
  }

  return `${message}: ${cause}`;
};

export const slugifyHeader = (raw: string, used: Set<string>): string => {
  const base =
    raw
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 60) || "column";
  let key = base === "pipeline_row_id" ? "column_pipeline_row_id" : base;
  let suffix = 2;
  while (used.has(key)) {
    key = `${base}_${suffix}`;
    suffix += 1;
  }
  used.add(key);
  return key;
};

export const revalidateAfterDatasetImport = (datasetId: string): void => {
  revalidatePath(routes.adminDatasets);
  revalidatePath(routes.adminPublishing);
  revalidatePath(routes.adminHome);
  revalidatePath(routes.appHome);
  revalidatePath(routes.datasets);
  revalidatePath(routes.datasetDetail.replace("[datasetId]", datasetId));
};

export interface PreparedTabularImport {
  attributeKeys: string[];
  columnDefinitions: { columns: Record<string, unknown>[] };
  dataRows: string[][];
  maxCols: number;
}

export const buildPreparedImportFromRows = (
  headerRow: string[],
  dataRows: string[][],
  emptyDataErrorMessage: string
): PreparedTabularImport => {
  if (dataRows.length < 1) {
    throw new Error(emptyDataErrorMessage);
  }

  const maxCols = Math.min(headerRow.length, sourceReadBounds.maxHeaderCount);

  if (maxCols < 1) {
    throw new Error("The first row must contain column headers.");
  }

  const usedKeys = new Set<string>(["pipeline_row_id"]);
  const headers = headerRow.slice(0, maxCols).map((h) => h.trim());
  const attributeKeys = headers.map((h) => slugifyHeader(h, usedKeys));

  const columnDefinitions = {
    columns: [
      {
        dataType: "text",
        filterable: true,
        key: "pipeline_row_id",
        kind: datasetColumnKind.system,
        label: "Row ID",
        searchable: true,
        sortable: true,
        source: "pipeline_row_id",
      },
      ...headers.map((label, index) => ({
        dataType: "text",
        filterable: true,
        key: attributeKeys[index] as string,
        kind: datasetColumnKind.attribute,
        label: label.slice(0, 120) || `Column ${index + 1}`,
        searchable: true,
        sortable: true,
        source: `attributes.${attributeKeys[index]}` as string,
      })),
    ],
  };

  const boundedDataRows = dataRows.slice(
    0,
    sourceReadBounds.maxConfiguredRowSpan
  );

  return {
    attributeKeys,
    columnDefinitions,
    dataRows: boundedDataRows,
    maxCols,
  };
};

export const insertRowsInChunks = async (params: {
  attributeKeys: string[];
  dataRows: string[][];
  datasetVersionId: string;
  maxCols: number;
  pipelineRowIdPrefix: string;
  sourceRef: string;
}): Promise<void> => {
  const {
    attributeKeys,
    dataRows,
    datasetVersionId,
    maxCols,
    pipelineRowIdPrefix,
    sourceRef,
  } = params;
  const supabase = createAdminClient();
  const chunkSize = 200;

  for (let offset = 0; offset < dataRows.length; offset += chunkSize) {
    const slice = dataRows.slice(offset, offset + chunkSize);
    const inserts = slice.map((row, sliceIndex) => {
      const globalIndex = offset + sliceIndex + 1;
      const attrs: Record<string, string> = {};
      for (let c = 0; c < maxCols; c += 1) {
        attrs[attributeKeys[c] as string] = String(row[c] ?? "").slice(0, 4000);
      }

      return {
        attributes: attrs as Json,
        dataset_version_id: datasetVersionId,
        lineage: {
          ingestedFrom: sourceRef,
        } as Json,
        pipeline_row_id: `${pipelineRowIdPrefix}-${globalIndex}`,
        row_index: globalIndex,
      };
    });

    const { error: rowsError } = await supabase
      .from("dataset_rows")
      .insert(inserts);

    if (rowsError) {
      await supabase
        .from("dataset_versions")
        .delete()
        .eq("id", datasetVersionId);
      throw new Error(
        toErrorMessage("Failed to insert dataset rows", rowsError.message)
      );
    }
  }
};

interface ActingUser {
  id: string;
}

export const persistDatasetImport = async (params: {
  actingUser: ActingUser;
  changeSummary: string;
  datasetId: string;
  metadata: Json;
  notes: string;
  pipelineRowIdPrefix: string;
  prepared: PreparedTabularImport;
  sourceRef: string;
}): Promise<void> => {
  const {
    actingUser,
    changeSummary,
    datasetId,
    metadata,
    notes,
    pipelineRowIdPrefix,
    prepared,
    sourceRef,
  } = params;
  const supabase = createAdminClient();

  const { data: dataset, error: datasetError } = await supabase
    .from("datasets")
    .select("id")
    .eq("id", datasetId)
    .maybeSingle();

  if (datasetError) {
    throw new Error(
      toErrorMessage("Failed to load the dataset", datasetError.message)
    );
  }

  if (!dataset) {
    throw new Error("The selected dataset could not be found.");
  }

  const { data: maxVersion, error: maxError } = await supabase
    .from("dataset_versions")
    .select("version_number")
    .eq("dataset_id", datasetId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (maxError) {
    throw new Error(
      toErrorMessage("Failed to read dataset versions", maxError.message)
    );
  }

  const nextVersionNumber = (maxVersion?.version_number ?? 0) + 1;
  const rowCount = prepared.dataRows.length;

  const { data: newVersion, error: versionInsertError } = await supabase
    .from("dataset_versions")
    .insert({
      change_summary: changeSummary,
      column_definitions: prepared.columnDefinitions as unknown as Json,
      dataset_id: datasetId,
      metadata,
      notes,
      row_count: rowCount,
      source_ref: sourceRef,
      version_number: nextVersionNumber,
    })
    .select("id")
    .single();

  if (versionInsertError || !newVersion) {
    throw new Error(
      toErrorMessage(
        "Failed to create dataset version",
        versionInsertError?.message ?? "unknown"
      )
    );
  }

  const datasetVersionId = newVersion.id;

  await insertRowsInChunks({
    attributeKeys: prepared.attributeKeys,
    dataRows: prepared.dataRows,
    datasetVersionId,
    maxCols: prepared.maxCols,
    pipelineRowIdPrefix,
    sourceRef,
  });

  const { error: activateError } = await supabase.rpc(
    "activate_dataset_version",
    {
      target_actor_user_id: actingUser.id,
      target_dataset_id: datasetId,
      target_dataset_version_id: datasetVersionId,
    }
  );

  if (activateError) {
    throw new Error(
      toErrorMessage(
        "Data was stored but activating the new version failed",
        activateError.message
      )
    );
  }

  revalidateAfterDatasetImport(datasetId);
  redirect(routes.datasetDetail.replace("[datasetId]", datasetId));
};
