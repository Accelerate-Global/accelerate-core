import { NextResponse } from "next/server";
import { ZodError } from "zod";

import type {
  ApiErrorCode,
  ApiErrorResponse,
} from "@/features/datasets/query-contract";

type ApiErrorDetails = ApiErrorResponse["details"];

export class DatasetApiError extends Error {
  code: ApiErrorCode;
  details?: ApiErrorDetails;
  status: number;

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    details?: ApiErrorDetails
  ) {
    super(message);
    this.name = "DatasetApiError";
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

const buildIssuePath = (path: PropertyKey[]): string => {
  return path.map(String).join(".") || "request";
};

export const createDatasetApiError = (
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: ApiErrorDetails
): DatasetApiError => {
  return new DatasetApiError(status, code, message, details);
};

export const createInvalidRequestError = (
  message: string,
  details?: ApiErrorDetails
): DatasetApiError => {
  return createDatasetApiError(400, "INVALID_REQUEST", message, details);
};

export const createValidationError = (
  error: ZodError,
  message = "The request payload is invalid."
): DatasetApiError => {
  return createInvalidRequestError(message, {
    issues: error.issues.map((issue) => ({
      message: issue.message,
      path: buildIssuePath(issue.path),
    })),
  });
};

export const getApiErrorResponse = (
  error: unknown
): { body: ApiErrorResponse; status: number } => {
  if (error instanceof DatasetApiError) {
    return {
      body: {
        code: error.code,
        details: error.details,
        message: error.message,
      },
      status: error.status,
    };
  }

  if (error instanceof ZodError) {
    const validationError = createValidationError(error);

    return {
      body: {
        code: validationError.code,
        details: validationError.details,
        message: validationError.message,
      },
      status: validationError.status,
    };
  }

  return {
    body: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error interrupted the dataset request.",
    },
    status: 500,
  };
};

export const toApiErrorResponse = (error: unknown) => {
  const { body, status } = getApiErrorResponse(error);

  return NextResponse.json(body, { status });
};
