import "server-only";

import {
  listReadableDatasetContexts,
  resolveReadableDatasetVersionContext,
} from "@/features/datasets/context-service";
import type {
  DatasetColumnDefinition,
  DatasetListResponse,
  DatasetMetadataResponse,
  DatasetSummary,
} from "@/features/datasets/query-contract";
import type { Dataset, DatasetVersion } from "@/features/datasets/types";

export interface ResolvedDatasetVersionContext {
  columns: DatasetColumnDefinition[];
  dataset: Dataset;
  metadata: DatasetMetadataResponse;
  version: DatasetVersion;
}

const mapDatasetSummary = (
  dataset: Dataset,
  rowCount: number,
  ownerWorkspace: DatasetMetadataResponse["dataset"]["ownerWorkspace"],
  sharedWorkspaceCount: number,
  lineageSummary: DatasetSummary["lineageSummary"]
): DatasetSummary => {
  return {
    activeVersionId: dataset.activeVersionId,
    accessMode: dataset.visibility,
    id: dataset.id,
    isHomeDataset: dataset.isDefaultGlobal,
    lineageSummary,
    name: dataset.name,
    ownerWorkspace,
    rowCount,
    sharedWorkspaceCount,
    slug: dataset.slug,
  };
};

const mapDatasetMetadata = (
  dataset: Dataset,
  version: DatasetVersion,
  columns: DatasetColumnDefinition[],
  ownerWorkspace: DatasetMetadataResponse["dataset"]["ownerWorkspace"],
  sharedWorkspaceCount: number,
  lineageSummary: DatasetMetadataResponse["version"]["lineageSummary"]
): DatasetMetadataResponse => {
  return {
    columns,
    dataset: {
      accessMode: dataset.visibility,
      id: dataset.id,
      isHomeDataset: dataset.isDefaultGlobal,
      name: dataset.name,
      ownerWorkspace,
      sharedWorkspaceCount,
      slug: dataset.slug,
    },
    version: {
      id: version.id,
      lineageSummary,
      rowCount: version.rowCount,
      versionNumber: version.versionNumber,
    },
  };
};

export const listDatasetSummaries = async (): Promise<DatasetListResponse> => {
  const datasets = await listReadableDatasetContexts();

  return {
    datasets: datasets.map((datasetContext) => {
      const activeVersion = datasetContext.activeVersion;

      return mapDatasetSummary(
        datasetContext.dataset,
        activeVersion?.rowCount ?? 0,
        datasetContext.ownerWorkspace,
        datasetContext.sharedWorkspaceCount,
        datasetContext.lineageSummary
      );
    }),
  };
};

export const resolveDatasetVersionContext = async (
  datasetId: string,
  versionId?: string
): Promise<ResolvedDatasetVersionContext> => {
  const datasetContext = await resolveReadableDatasetVersionContext(
    datasetId,
    versionId
  );
  const columns = datasetContext.version.columnDefinitions.columns;

  return {
    columns,
    dataset: datasetContext.dataset,
    metadata: mapDatasetMetadata(
      datasetContext.dataset,
      datasetContext.version,
      columns,
      datasetContext.ownerWorkspace,
      datasetContext.sharedWorkspaceCount,
      datasetContext.lineageSummary
    ),
    version: datasetContext.version,
  };
};

export const getDatasetMetadata = async (
  datasetId: string,
  versionId?: string
): Promise<DatasetMetadataResponse> => {
  const context = await resolveDatasetVersionContext(datasetId, versionId);

  return context.metadata;
};
