import "server-only";

import {
  type Dataset,
  type DatasetRow,
  type DatasetVersion,
  normalizeDataset,
  normalizeDatasetRow,
  normalizeDatasetVersion,
} from "@/features/datasets/types";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
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

export const listReadableDatasetVersionsByIds = async (
  datasetVersionIds: string[]
): Promise<DatasetVersion[]> => {
  if (datasetVersionIds.length === 0) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("dataset_versions")
    .select(datasetVersionSelect)
    .in("id", datasetVersionIds);

  if (error) {
    throw new Error(
      toErrorMessage("Failed to list dataset versions", error.message)
    );
  }

  return (data as unknown as Tables<"dataset_versions">[]).map(
    normalizeDatasetVersion
  );
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

export const getDatasetRecordByIdAdmin = async (
  datasetId: string
): Promise<Tables<"datasets"> | null> => {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from("datasets")
    .select(datasetSelect)
    .eq("id", datasetId)
    .maybeSingle();

  if (error) {
    throw new Error(
      toErrorMessage("Failed to load dataset by id", error.message)
    );
  }

  return data as Tables<"datasets"> | null;
};

export const getDatasetVersionRecordByIdAdmin = async (
  datasetVersionId: string
): Promise<Tables<"dataset_versions"> | null> => {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from("dataset_versions")
    .select(datasetVersionSelect)
    .eq("id", datasetVersionId)
    .maybeSingle();

  if (error) {
    throw new Error(
      toErrorMessage("Failed to load dataset version by id", error.message)
    );
  }

  return data as Tables<"dataset_versions"> | null;
};
