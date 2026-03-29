import type { z } from "zod";

import {
  type ApiErrorResponse,
  apiErrorResponseSchema,
  type DatasetListResponse,
  type DatasetMetadataResponse,
  type DatasetQueryRequest,
  type DatasetQueryResponse,
  datasetListResponseSchema,
  datasetMetadataResponseSchema,
  datasetQueryRequestSchema,
  datasetQueryResponseSchema,
} from "@/features/datasets/query-contract";

export class DatasetBrowserApiError extends Error {
  body?: ApiErrorResponse;
  status: number;

  constructor(status: number, message: string, body?: ApiErrorResponse) {
    super(message);
    this.name = "DatasetBrowserApiError";
    this.body = body;
    this.status = status;
  }
}

const datasetJsonContentType = "application/json";

const parseResponseBody = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get("content-type");

  if (contentType?.includes(datasetJsonContentType)) {
    return response.json();
  }

  const textBody = await response.text();

  if (!textBody.trim()) {
    return null;
  }

  try {
    return JSON.parse(textBody);
  } catch {
    return textBody;
  }
};

const parseApiErrorBody = (payload: unknown): ApiErrorResponse | undefined => {
  const parsedPayload = apiErrorResponseSchema.safeParse(payload);

  if (parsedPayload.success) {
    return parsedPayload.data;
  }

  return undefined;
};

const parseDatasetSuccessBody = <TSchema extends z.ZodType>(
  payload: unknown,
  schema: TSchema
): z.infer<TSchema> => {
  const parsedPayload = schema.safeParse(payload);

  if (parsedPayload.success) {
    return parsedPayload.data;
  }

  throw new DatasetBrowserApiError(
    500,
    "The dataset API response could not be validated."
  );
};

export const resolveDatasetApiPath = (
  path: string,
  baseUrl?: string
): string => {
  if (!baseUrl) {
    return path;
  }

  return new URL(path, baseUrl).toString();
};

export const fetchDatasetApi = async <TSchema extends z.ZodType>(
  path: string,
  schema: TSchema,
  init?: RequestInit
): Promise<z.infer<TSchema>> => {
  const response = await fetch(path, {
    cache: "no-store",
    ...init,
    headers: {
      accept: datasetJsonContentType,
      ...init?.headers,
    },
  });
  const payload = await parseResponseBody(response);

  if (!response.ok) {
    const errorBody = parseApiErrorBody(payload);

    throw new DatasetBrowserApiError(
      response.status,
      errorBody?.message ?? "The dataset request failed.",
      errorBody
    );
  }

  return parseDatasetSuccessBody(payload, schema);
};

export const getDatasetsApiPath = (): string => {
  return "/api/datasets";
};

export const getDatasetMetadataApiPath = (
  datasetId: string,
  versionId?: string
): string => {
  const params = new URLSearchParams();

  if (versionId) {
    params.set("versionId", versionId);
  }

  const search = params.toString();

  return `/api/datasets/${datasetId}/metadata${search ? `?${search}` : ""}`;
};

export const getDatasetQueryApiPath = (datasetId: string): string => {
  return `/api/datasets/${datasetId}/query`;
};

export const parseDatasetListResponse = (
  payload: DatasetListResponse
): DatasetListResponse => {
  return parseDatasetSuccessBody(payload, datasetListResponseSchema);
};

export const parseDatasetMetadataResponse = (
  payload: DatasetMetadataResponse
): DatasetMetadataResponse => {
  return parseDatasetSuccessBody(payload, datasetMetadataResponseSchema);
};

export const parseDatasetQueryRequest = (
  payload: DatasetQueryRequest
): DatasetQueryRequest => {
  return parseDatasetSuccessBody(payload, datasetQueryRequestSchema);
};

export const parseDatasetQueryResponse = (
  payload: DatasetQueryResponse
): DatasetQueryResponse => {
  return parseDatasetSuccessBody(payload, datasetQueryResponseSchema);
};
