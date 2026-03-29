import { NextResponse } from "next/server";
import {
  createDatasetApiError,
  toApiErrorResponse,
} from "@/features/datasets/errors";
import { listDatasetSummaries } from "@/features/datasets/metadata-service";
import { datasetListResponseSchema } from "@/features/datasets/query-contract";
import { requireAuthenticatedUser } from "@/lib/auth/server";

export async function GET() {
  try {
    await requireAuthenticatedUser();

    const response = await listDatasetSummaries();
    const parsedResponse = datasetListResponseSchema.safeParse(response);

    if (!parsedResponse.success) {
      throw createDatasetApiError(
        500,
        "INTERNAL_ERROR",
        "The dataset list response could not be validated."
      );
    }

    return NextResponse.json(parsedResponse.data);
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
