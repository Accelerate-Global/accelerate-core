import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createDatasetApiError,
  createValidationError,
  toApiErrorResponse,
} from "@/features/datasets/errors";
import { getDatasetMetadata } from "@/features/datasets/metadata-service";
import { datasetMetadataResponseSchema } from "@/features/datasets/query-contract";
import { requireAuthenticatedUser } from "@/lib/auth/server";

const datasetRouteParamsSchema = z.object({
  datasetId: z.string().uuid(),
});

const datasetMetadataSearchParamsSchema = z.object({
  versionId: z.string().uuid().optional(),
});

interface DatasetMetadataRouteContext {
  params: Promise<{
    datasetId: string;
  }>;
}

export async function GET(
  request: Request,
  { params }: DatasetMetadataRouteContext
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

    const url = new URL(request.url);
    const parsedSearchParams = datasetMetadataSearchParamsSchema.safeParse(
      Object.fromEntries(url.searchParams.entries())
    );

    if (!parsedSearchParams.success) {
      throw createValidationError(
        parsedSearchParams.error,
        "The metadata request query parameters are invalid."
      );
    }

    const response = await getDatasetMetadata(
      parsedParams.data.datasetId,
      parsedSearchParams.data.versionId
    );
    const parsedResponse = datasetMetadataResponseSchema.safeParse(response);

    if (!parsedResponse.success) {
      throw createDatasetApiError(
        500,
        "INTERNAL_ERROR",
        "The dataset metadata response could not be validated."
      );
    }

    return NextResponse.json(parsedResponse.data);
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
