"use client";

import {
  fetchDatasetApi,
  getDatasetMetadataApiPath,
  getDatasetQueryApiPath,
  getDatasetsApiPath,
  parseDatasetQueryRequest,
  resolveDatasetApiPath,
} from "@/features/datasets/browser/api-common";
import type {
  DatasetListResponse,
  DatasetMetadataResponse,
  DatasetQueryRequest,
  DatasetQueryResponse,
} from "@/features/datasets/query-contract";
import {
  datasetListResponseSchema,
  datasetMetadataResponseSchema,
  datasetQueryResponseSchema,
} from "@/features/datasets/query-contract";
import { routes } from "@/lib/routes";

import { DatasetBrowserApiError } from "./api-common";

const redirectToLogin = () => {
  window.location.assign(routes.login);
};

const handleClientDatasetError = (error: unknown): never => {
  if (error instanceof DatasetBrowserApiError && error.status === 401) {
    redirectToLogin();
  }

  throw error;
};

export const fetchDatasetListClient =
  async (): Promise<DatasetListResponse> => {
    try {
      return await fetchDatasetApi(
        resolveDatasetApiPath(getDatasetsApiPath()),
        datasetListResponseSchema,
        {
          credentials: "include",
          method: "GET",
        }
      );
    } catch (error) {
      return handleClientDatasetError(error);
    }
  };

export const fetchDatasetMetadataClient = async (
  datasetId: string,
  versionId?: string
): Promise<DatasetMetadataResponse> => {
  try {
    return await fetchDatasetApi(
      resolveDatasetApiPath(getDatasetMetadataApiPath(datasetId, versionId)),
      datasetMetadataResponseSchema,
      {
        credentials: "include",
        method: "GET",
      }
    );
  } catch (error) {
    return handleClientDatasetError(error);
  }
};

export const queryDatasetRowsClient = async (
  datasetId: string,
  request: DatasetQueryRequest,
  signal?: AbortSignal
): Promise<DatasetQueryResponse> => {
  try {
    return await fetchDatasetApi(
      resolveDatasetApiPath(getDatasetQueryApiPath(datasetId)),
      datasetQueryResponseSchema,
      {
        body: JSON.stringify(parseDatasetQueryRequest(request)),
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
        signal,
      }
    );
  } catch (error) {
    return handleClientDatasetError(error);
  }
};
