import { type NextRequest } from "next/server";
import { UploadResourceVersionRequestSchema } from "@accelerate-core/shared";
import { proxyJsonToApi } from "../../_lib/proxy";

export async function GET(req: NextRequest, ctx: { params: Promise<{ resourceSlug: string }> }) {
  const { resourceSlug } = await ctx.params;
  return proxyJsonToApi({
    req,
    method: "GET",
    path: `/resources/${encodeURIComponent(resourceSlug)}/versions`
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ resourceSlug: string }> }) {
  const { resourceSlug } = await ctx.params;
  const json = await req.json().catch(() => null);
  const body = UploadResourceVersionRequestSchema.parse(json);

  return proxyJsonToApi({
    req,
    method: "POST",
    path: `/resources/${encodeURIComponent(resourceSlug)}/versions`,
    body
  });
}
