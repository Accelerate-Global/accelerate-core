import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createDatasetApiError,
  createValidationError,
  toApiErrorResponse,
} from "@/features/datasets/errors";
import { datasetQueryResponseSchema } from "@/features/datasets/query-contract";
import { queryDatasetRows } from "@/features/datasets/query-service";
import { requireAuthenticatedUser } from "@/lib/auth/server";

const datasetRouteParamsSchema = z.object({
  datasetId: z.string().uuid(),
});

interface DatasetQueryRouteContext {
  params: Promise<{
    datasetId: string;
  }>;
}

export async function POST(
  request: Request,
  { params }: DatasetQueryRouteContext
) {
  try {
    await requireAuthenticatedUser();

    const parsedParams = datasetRouteParamsSchema.safeParse(await params);

    if (!parsedParams.success) {
      throw createValidationError(
        parsedParams.error,
        "The dataset id must be a valid UUID."
      );
    }

    let requestBody: unknown;

    try {
      requestBody = await request.json();
    } catch {
      throw createDatasetApiError(
        400,
        "INVALID_REQUEST",
        "The query request body must be valid JSON."
      );
    }

    const response = await queryDatasetRows(
      parsedParams.data.datasetId,
      requestBody
    );
    const parsedResponse = datasetQueryResponseSchema.safeParse(response);

    if (!parsedResponse.success) {
      throw createDatasetApiError(
        500,
        "INTERNAL_ERROR",
        "The dataset query response could not be validated."
      );
    }

    return NextResponse.json(parsedResponse.data);
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
