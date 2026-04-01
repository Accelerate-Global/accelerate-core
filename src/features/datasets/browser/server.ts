import "server-only";

import type { DatasetSummary } from "@/features/datasets/query-contract";

import { DatasetBrowserApiError } from "./api-common";
import {
  fetchDatasetListServer,
  fetchDatasetMetadataServer,
  queryDatasetRowsServer,
} from "./server-api";
import {
  type DatasetBrowserResolvedState,
  findDatasetBrowserHomeDataset,
  isDatasetBrowserUuid,
} from "./types";
import {
  buildDatasetQueryRequest,
  type DatasetBrowserSearchParamsInput,
  getDatasetBrowserStateKey,
  parseDatasetBrowserSearchState,
  sanitizeDatasetBrowserSearchState,
} from "./url-state";

const mapDatasetBrowserApiError = (
  error: unknown
): DatasetBrowserResolvedState => {
  if (!(error instanceof DatasetBrowserApiError)) {
    throw error;
  }

  if (error.status === 403) {
    return {
      status: "access-denied",
    };
  }

  if (error.status === 404) {
    return {
      status: "not-found",
    };
  }

  if (error.status === 409) {
    return {
      message: error.body?.message ?? "This dataset version is unavailable.",
      status: "unavailable",
    };
  }

  throw error;
};

const loadDatasetBrowserReadyState = async (
  datasetId: string,
  searchParams: DatasetBrowserSearchParamsInput
): Promise<DatasetBrowserResolvedState> => {
  try {
    const rawSearchState = parseDatasetBrowserSearchState(searchParams);
    const metadata = await fetchDatasetMetadataServer(
      datasetId,
      rawSearchState.versionId
    );
    const searchState = sanitizeDatasetBrowserSearchState(
      rawSearchState,
      metadata.columns
    );
    const initialQuery = await queryDatasetRowsServer(
      datasetId,
      buildDatasetQueryRequest(searchState, metadata.columns)
    );
    const initialSearchState =
      initialQuery.page === searchState.page
        ? searchState
        : {
            ...searchState,
            page: initialQuery.page,
          };

    return {
      initialQuery,
      initialSearchState,
      metadata,
      stateKey: getDatasetBrowserStateKey(initialSearchState),
      status: "ready",
    };
  } catch (error) {
    return mapDatasetBrowserApiError(error);
  }
};

export const loadDatasetDirectoryPage = async (): Promise<DatasetSummary[]> => {
  const response = await fetchDatasetListServer();

  return response.datasets;
};

export const loadDatasetHomePage = async (
  searchParams: DatasetBrowserSearchParamsInput
): Promise<DatasetBrowserResolvedState> => {
  const response = await fetchDatasetListServer();
  const homeDataset = findDatasetBrowserHomeDataset(response.datasets);

  if (!homeDataset) {
    return {
      status: "empty-home",
    };
  }

  return loadDatasetBrowserReadyState(homeDataset.id, searchParams);
};

export const loadDatasetDetailPage = (
  datasetId: string,
  searchParams: DatasetBrowserSearchParamsInput
): Promise<DatasetBrowserResolvedState> => {
  if (!isDatasetBrowserUuid(datasetId)) {
    return Promise.resolve({
      status: "not-found",
    });
  }

  return loadDatasetBrowserReadyState(datasetId, searchParams);
};
