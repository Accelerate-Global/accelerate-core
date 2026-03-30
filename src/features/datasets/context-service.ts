import "server-only";

import {
  createDatasetApiError,
  createInvalidRequestError,
} from "@/features/datasets/errors";
import type { DatasetSummary } from "@/features/datasets/query-contract";
import {
  getDatasetRecordByIdAdmin,
  getDatasetVersionRecordByIdAdmin,
  getReadableDatasetById,
  getReadableDatasetVersionById,
  listDatasetAccessByDatasetIdsAdmin,
  listDatasetVersionSourcesByDatasetVersionIdsAdmin,
  listReadableDatasets,
  listReadableDatasetVersionsByIds,
  listWorkspaceRecordsByIdsAdmin,
} from "@/features/datasets/server";
import type {
  Dataset,
  DatasetLineageSummary,
  DatasetVersion,
  DatasetVersionSource,
  DatasetWorkspaceReference,
} from "@/features/datasets/types";
import { canCurrentUserReadDataset } from "@/lib/permissions/server";

export interface DatasetContextSupplement {
  lineageSummary: DatasetLineageSummary;
  ownerWorkspace: DatasetWorkspaceReference | null;
  sharedWorkspaceCount: number;
  sharedWorkspaceIds: string[];
}

export interface ReadableDatasetContext extends DatasetContextSupplement {
  activeVersion: DatasetVersion | null;
  dataset: Dataset;
}

export interface ReadableDatasetVersionContext
  extends DatasetContextSupplement {
  dataset: Dataset;
  version: DatasetVersion;
}

const emptyLineageSummary: DatasetLineageSummary = {
  isDerived: false,
  relationTypes: [],
  sourceCount: 0,
};

const buildWorkspaceReference = (
  value: Awaited<ReturnType<typeof listWorkspaceRecordsByIdsAdmin>>[number]
): DatasetWorkspaceReference => {
  return {
    id: value.id,
    name: value.name,
    slug: value.slug,
  };
};

const buildLineageSummary = (
  sources: DatasetVersionSource[]
): DatasetLineageSummary => {
  if (sources.length === 0) {
    return emptyLineageSummary;
  }

  return {
    isDerived: true,
    relationTypes: Array.from(
      new Set(sources.map((source) => source.relationType))
    ).sort((leftType, rightType) => leftType.localeCompare(rightType)),
    sourceCount: sources.length,
  };
};

const buildSupplementMaps = async (
  datasets: Dataset[],
  datasetVersionIds: string[]
): Promise<{
  ownerWorkspaceById: Map<string, DatasetWorkspaceReference>;
  sharedWorkspaceIdsByDatasetId: Map<string, string[]>;
  lineageSummaryByVersionId: Map<string, DatasetLineageSummary>;
}> => {
  const datasetIds = Array.from(new Set(datasets.map((dataset) => dataset.id)));
  const ownerWorkspaceIds = Array.from(
    new Set(
      datasets
        .map((dataset) => dataset.ownerWorkspaceId)
        .filter((value): value is string => Boolean(value))
    )
  );

  const [accessRecords, lineageSources, ownerWorkspaces] = await Promise.all([
    listDatasetAccessByDatasetIdsAdmin(datasetIds),
    listDatasetVersionSourcesByDatasetVersionIdsAdmin(datasetVersionIds),
    listWorkspaceRecordsByIdsAdmin(ownerWorkspaceIds),
  ]);

  const ownerWorkspaceById = new Map(
    ownerWorkspaces.map(
      (workspace) => [workspace.id, buildWorkspaceReference(workspace)] as const
    )
  );
  const sharedWorkspaceIdsByDatasetId = new Map<string, string[]>();

  for (const accessRecord of accessRecords) {
    if (!accessRecord.workspace_id) {
      continue;
    }

    const currentWorkspaceIds =
      sharedWorkspaceIdsByDatasetId.get(accessRecord.dataset_id) ?? [];

    if (!currentWorkspaceIds.includes(accessRecord.workspace_id)) {
      currentWorkspaceIds.push(accessRecord.workspace_id);
      currentWorkspaceIds.sort((leftId, rightId) =>
        leftId.localeCompare(rightId)
      );
      sharedWorkspaceIdsByDatasetId.set(
        accessRecord.dataset_id,
        currentWorkspaceIds
      );
    }
  }

  const sourcesByVersionId = new Map<string, DatasetVersionSource[]>();

  for (const source of lineageSources) {
    const currentSources =
      sourcesByVersionId.get(source.datasetVersionId) ?? [];
    currentSources.push(source);
    sourcesByVersionId.set(source.datasetVersionId, currentSources);
  }

  const lineageSummaryByVersionId = new Map<string, DatasetLineageSummary>();

  for (const datasetVersionId of datasetVersionIds) {
    lineageSummaryByVersionId.set(
      datasetVersionId,
      buildLineageSummary(sourcesByVersionId.get(datasetVersionId) ?? [])
    );
  }

  return {
    lineageSummaryByVersionId,
    ownerWorkspaceById,
    sharedWorkspaceIdsByDatasetId,
  };
};

export const getDatasetContextSupplement = async (
  dataset: Dataset,
  version: DatasetVersion | null
): Promise<DatasetContextSupplement> => {
  const supplementMaps = await buildSupplementMaps(
    [dataset],
    version ? [version.id] : []
  );

  return {
    lineageSummary: version
      ? (supplementMaps.lineageSummaryByVersionId.get(version.id) ??
        emptyLineageSummary)
      : emptyLineageSummary,
    ownerWorkspace: dataset.ownerWorkspaceId
      ? (supplementMaps.ownerWorkspaceById.get(dataset.ownerWorkspaceId) ??
        null)
      : null,
    sharedWorkspaceCount: (
      supplementMaps.sharedWorkspaceIdsByDatasetId.get(dataset.id) ?? []
    ).length,
    sharedWorkspaceIds:
      supplementMaps.sharedWorkspaceIdsByDatasetId.get(dataset.id) ?? [],
  };
};

export const mapReadableDatasetContextToSummary = (
  datasetContext: ReadableDatasetContext
): DatasetSummary => {
  return {
    activeVersionId: datasetContext.dataset.activeVersionId,
    accessMode: datasetContext.dataset.visibility,
    id: datasetContext.dataset.id,
    isHomeDataset: datasetContext.dataset.isDefaultGlobal,
    lineageSummary: datasetContext.lineageSummary,
    name: datasetContext.dataset.name,
    ownerWorkspace: datasetContext.ownerWorkspace,
    rowCount: datasetContext.activeVersion?.rowCount ?? 0,
    sharedWorkspaceCount: datasetContext.sharedWorkspaceCount,
    slug: datasetContext.dataset.slug,
  };
};

export const listReadableDatasetContexts = async (): Promise<
  ReadableDatasetContext[]
> => {
  const datasets = await listReadableDatasets();
  const activeVersionIds = Array.from(
    new Set(
      datasets
        .map((dataset) => dataset.activeVersionId)
        .filter((value): value is string => Boolean(value))
    )
  );
  const versions = await listReadableDatasetVersionsByIds(activeVersionIds);
  const versionsById = new Map(
    versions.map((version) => [version.id, version] as const)
  );
  const supplementMaps = await buildSupplementMaps(datasets, activeVersionIds);

  return datasets.map((dataset) => {
    const activeVersion = dataset.activeVersionId
      ? (versionsById.get(dataset.activeVersionId) ?? null)
      : null;
    const sharedWorkspaceIds =
      supplementMaps.sharedWorkspaceIdsByDatasetId.get(dataset.id) ?? [];

    return {
      activeVersion,
      dataset,
      lineageSummary: activeVersion
        ? (supplementMaps.lineageSummaryByVersionId.get(activeVersion.id) ??
          emptyLineageSummary)
        : emptyLineageSummary,
      ownerWorkspace: dataset.ownerWorkspaceId
        ? (supplementMaps.ownerWorkspaceById.get(dataset.ownerWorkspaceId) ??
          null)
        : null,
      sharedWorkspaceCount: sharedWorkspaceIds.length,
      sharedWorkspaceIds,
    };
  });
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

export const resolveReadableDatasetVersionContext = async (
  datasetId: string,
  versionId?: string
): Promise<ReadableDatasetVersionContext> => {
  const dataset = await getReadableDatasetOrThrow(datasetId);
  const version = await getReadableVersionOrThrow(dataset, versionId);
  const supplement = await getDatasetContextSupplement(dataset, version);

  return {
    dataset,
    ...supplement,
    version,
  };
};
