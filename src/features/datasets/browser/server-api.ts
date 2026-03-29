import "server-only";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

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
import { getAppUrl } from "@/lib/env";
import { routes } from "@/lib/routes";

import { DatasetBrowserApiError } from "./api-common";

const getCookieHeader = async (): Promise<string> => {
  const cookieStore = await cookies();

  return cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
};

const getDatasetRequestOrigin = async (): Promise<string> => {
  const requestHeaders = await headers();
  const forwardedHost =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const forwardedProto = requestHeaders.get("x-forwarded-proto");

  if (forwardedHost) {
    const protocol =
      forwardedProto ??
      (forwardedHost.startsWith("localhost") ? "http" : "https");

    return `${protocol}://${forwardedHost}`;
  }

  return getAppUrl();
};

const fetchDatasetApiOnServer = async <TResult>(
  path: string,
  schema: Parameters<typeof fetchDatasetApi>[1],
  init?: RequestInit
): Promise<TResult> => {
  try {
    const cookieHeader = await getCookieHeader();
    const origin = await getDatasetRequestOrigin();

    return (await fetchDatasetApi(resolveDatasetApiPath(path, origin), schema, {
      ...init,
      headers: {
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
        ...init?.headers,
      },
    })) as TResult;
  } catch (error) {
    if (error instanceof DatasetBrowserApiError && error.status === 401) {
      redirect(routes.login);
    }

    throw error;
  }
};

export const fetchDatasetListServer = (): Promise<DatasetListResponse> => {
  return fetchDatasetApiOnServer<DatasetListResponse>(
    getDatasetsApiPath(),
    datasetListResponseSchema,
    {
      method: "GET",
    }
  );
};

export const fetchDatasetMetadataServer = (
  datasetId: string,
  versionId?: string
): Promise<DatasetMetadataResponse> => {
  return fetchDatasetApiOnServer<DatasetMetadataResponse>(
    getDatasetMetadataApiPath(datasetId, versionId),
    datasetMetadataResponseSchema,
    {
      method: "GET",
    }
  );
};

export const queryDatasetRowsServer = (
  datasetId: string,
  request: DatasetQueryRequest
): Promise<DatasetQueryResponse> => {
  return fetchDatasetApiOnServer<DatasetQueryResponse>(
    getDatasetQueryApiPath(datasetId),
    datasetQueryResponseSchema,
    {
      body: JSON.stringify(parseDatasetQueryRequest(request)),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    }
  );
};
