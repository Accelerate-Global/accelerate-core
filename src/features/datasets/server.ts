import "server-only";

import {
  type Dataset,
  type DatasetRow,
  type DatasetVersion,
  normalizeDataset,
  normalizeDatasetRow,
  normalizeDatasetVersion,
} from "@/features/datasets/types";
import type { Tables } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const datasetSelect =
  "id, slug, name, description, visibility, is_default_global, " +
  "owner_workspace_id, active_version_id, metadata, created_at, updated_at";

const datasetVersionSelect =
  "id, dataset_id, version_number, column_definitions, row_count, " +
  "source_ref, metadata, created_at";

const datasetRowSelect =
  "id, dataset_version_id, pipeline_row_id, row_index, attributes, " +
  "lineage, created_at, updated_at";

const toErrorMessage = (message: string, cause?: string): string => {
  if (!cause) {
    return message;
  }

  return `${message}: ${cause}`;
};

export const listReadableDatasets = async (): Promise<Dataset[]> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("datasets")
    .select(datasetSelect)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(
      toErrorMessage("Failed to list readable datasets", error.message)
    );
  }

  return (data as unknown as Tables<"datasets">[]).map(normalizeDataset);
};

export const getReadableDatasetById = async (
  datasetId: string
): Promise<Dataset | null> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("datasets")
    .select(datasetSelect)
    .eq("id", datasetId)
    .maybeSingle();

  if (error) {
    throw new Error(toErrorMessage("Failed to load dataset", error.message));
  }

  return data ? normalizeDataset(data as unknown as Tables<"datasets">) : null;
};

export const getDefaultGlobalDataset = async (): Promise<Dataset | null> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("datasets")
    .select(datasetSelect)
    .eq("is_default_global", true)
    .maybeSingle();

  if (error) {
    throw new Error(
      toErrorMessage("Failed to load the default global dataset", error.message)
    );
  }

  return data ? normalizeDataset(data as unknown as Tables<"datasets">) : null;
};

export const getReadableDatasetVersionById = async (
  datasetVersionId: string
): Promise<DatasetVersion | null> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("dataset_versions")
    .select(datasetVersionSelect)
    .eq("id", datasetVersionId)
    .maybeSingle();

  if (error) {
    throw new Error(
      toErrorMessage("Failed to load dataset version", error.message)
    );
  }

  return data
    ? normalizeDatasetVersion(data as unknown as Tables<"dataset_versions">)
    : null;
};

export const getReadableActiveDatasetVersion = async (
  datasetId: string
): Promise<DatasetVersion | null> => {
  const dataset = await getReadableDatasetById(datasetId);

  if (!dataset?.activeVersionId) {
    return null;
  }

  return getReadableDatasetVersionById(dataset.activeVersionId);
};

export const listReadableDatasetRows = async (
  datasetVersionId: string,
  limit = 100
): Promise<DatasetRow[]> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("dataset_rows")
    .select(datasetRowSelect)
    .eq("dataset_version_id", datasetVersionId)
    .order("row_index", { ascending: true, nullsFirst: false })
    .limit(limit);

  if (error) {
    throw new Error(
      toErrorMessage("Failed to list dataset rows", error.message)
    );
  }

  return (data as unknown as Tables<"dataset_rows">[]).map(normalizeDatasetRow);
};
