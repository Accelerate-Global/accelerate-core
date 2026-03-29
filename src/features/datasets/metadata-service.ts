import "server-only";

import {
  createDatasetApiError,
  createInvalidRequestError,
} from "@/features/datasets/errors";
import type {
  DatasetColumnDefinition,
  DatasetListResponse,
  DatasetMetadataResponse,
  DatasetSummary,
} from "@/features/datasets/query-contract";
import {
  getDatasetRecordByIdAdmin,
  getDatasetVersionRecordByIdAdmin,
  getReadableDatasetById,
  getReadableDatasetVersionById,
  listReadableDatasets,
  listReadableDatasetVersionsByIds,
} from "@/features/datasets/server";
import type { Dataset, DatasetVersion } from "@/features/datasets/types";
import { canCurrentUserReadDataset } from "@/lib/permissions/server";

export interface ResolvedDatasetVersionContext {
  columns: DatasetColumnDefinition[];
  dataset: Dataset;
  metadata: DatasetMetadataResponse;
  version: DatasetVersion;
}

const mapDatasetSummary = (
  dataset: Dataset,
  rowCount: number
): DatasetSummary => {
  return {
    activeVersionId: dataset.activeVersionId,
    accessMode: dataset.visibility,
    id: dataset.id,
    isHomeDataset: dataset.isDefaultGlobal,
    name: dataset.name,
    rowCount,
    slug: dataset.slug,
  };
};

const mapDatasetMetadata = (
  dataset: Dataset,
  version: DatasetVersion,
  columns: DatasetColumnDefinition[]
): DatasetMetadataResponse => {
  return {
    columns,
    dataset: {
      accessMode: dataset.visibility,
      id: dataset.id,
      isHomeDataset: dataset.isDefaultGlobal,
      name: dataset.name,
      slug: dataset.slug,
    },
    version: {
      id: version.id,
      rowCount: version.rowCount,
      versionNumber: version.versionNumber,
    },
  };
};

const getReadableDatasetOrThrow = async (
  datasetId: string
): Promise<Dataset> => {
  const datasetRecord = await getDatasetRecordByIdAdmin(datasetId);

  if (!datasetRecord) {
    throw createDatasetApiError(
      404,
      "DATASET_NOT_FOUND",
      "The requested dataset does not exist."
    );
  }

  if (!(await canCurrentUserReadDataset(datasetId))) {
    throw createDatasetApiError(
      403,
      "DATASET_ACCESS_DENIED",
      "You do not have access to this dataset."
    );
  }

  const dataset = await getReadableDatasetById(datasetId);

  if (!dataset) {
    throw createDatasetApiError(
      500,
      "INTERNAL_ERROR",
      "The dataset could not be loaded."
    );
  }

  return dataset;
};

const getReadableVersionOrThrow = async (
  dataset: Dataset,
  versionId?: string
): Promise<DatasetVersion> => {
  if (!versionId) {
    if (!dataset.activeVersionId) {
      throw createDatasetApiError(
        409,
        "DATASET_VERSION_UNAVAILABLE",
        "This dataset does not have an active version yet."
      );
    }

    const activeVersionRecord = await getDatasetVersionRecordByIdAdmin(
      dataset.activeVersionId
    );

    if (!activeVersionRecord) {
      throw createDatasetApiError(
        409,
        "DATASET_VERSION_UNAVAILABLE",
        "The dataset active version is unavailable."
      );
    }

    const readableActiveVersion = await getReadableDatasetVersionById(
      dataset.activeVersionId
    );

    if (!readableActiveVersion) {
      throw createDatasetApiError(
        409,
        "DATASET_VERSION_UNAVAILABLE",
        "The dataset active version is unavailable."
      );
    }

    return readableActiveVersion;
  }

  const versionRecord = await getDatasetVersionRecordByIdAdmin(versionId);

  if (!versionRecord) {
    throw createDatasetApiError(
      404,
      "DATASET_VERSION_NOT_FOUND",
      "The requested dataset version does not exist."
    );
  }

  if (versionRecord.dataset_id !== dataset.id) {
    throw createInvalidRequestError(
      "The requested dataset version does not belong to this dataset.",
      {
        datasetId: dataset.id,
        versionId,
      }
    );
  }

  const readableVersion = await getReadableDatasetVersionById(versionId);

  if (!readableVersion) {
    throw createDatasetApiError(
      409,
      "DATASET_VERSION_UNAVAILABLE",
      "The requested dataset version is unavailable."
    );
  }

  return readableVersion;
};

export const listDatasetSummaries = async (): Promise<DatasetListResponse> => {
  const datasets = await listReadableDatasets();
  const activeVersionIds = datasets
    .map((dataset) => dataset.activeVersionId)
    .filter((value): value is string => Boolean(value));
  const versions = await listReadableDatasetVersionsByIds(activeVersionIds);
  const versionsById = new Map(
    versions.map((version) => [version.id, version] as const)
  );

  return {
    datasets: datasets.map((dataset) => {
      const activeVersion = dataset.activeVersionId
        ? versionsById.get(dataset.activeVersionId)
        : undefined;

      return mapDatasetSummary(dataset, activeVersion?.rowCount ?? 0);
    }),
  };
};

export const resolveDatasetVersionContext = async (
  datasetId: string,
  versionId?: string
): Promise<ResolvedDatasetVersionContext> => {
  const dataset = await getReadableDatasetOrThrow(datasetId);
  const version = await getReadableVersionOrThrow(dataset, versionId);
  const columns = version.columnDefinitions.columns;

  return {
    columns,
    dataset,
    metadata: mapDatasetMetadata(dataset, version, columns),
    version,
  };
};

export const getDatasetMetadata = async (
  datasetId: string,
  versionId?: string
): Promise<DatasetMetadataResponse> => {
  const context = await resolveDatasetVersionContext(datasetId, versionId);

  return context.metadata;
};
