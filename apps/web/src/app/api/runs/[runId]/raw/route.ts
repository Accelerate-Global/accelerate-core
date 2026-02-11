import { NextResponse, type NextRequest } from "next/server";
import { buildCsvDownloadResponse } from "./download-csv";

function getApiBaseUrl(): string {
  const baseUrl = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) throw new Error("Missing API_BASE_URL / NEXT_PUBLIC_API_BASE_URL");
  return baseUrl.replace(/\/$/, "");
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ runId: string }> }) {
  const auth = req.headers.get("authorization");
  if (!auth) return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });

  const { runId } = await ctx.params;
  const response = await buildCsvDownloadResponse({
    runId,
    auth,
    apiBaseUrl: getApiBaseUrl()
  });

  return new NextResponse(response.body, {
    status: response.status,
    headers: response.headers
  });
}
