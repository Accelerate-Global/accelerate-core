import { type NextRequest } from "next/server";
import { proxyJsonToApi } from "../../../_lib/proxy";

export async function GET(req: NextRequest, ctx: { params: Promise<{ resourceSlug: string; versionId: string }> }) {
  const { resourceSlug, versionId } = await ctx.params;
  return proxyJsonToApi({
    req,
    method: "GET",
    path: `/resources/${encodeURIComponent(resourceSlug)}/versions/${encodeURIComponent(versionId)}`
  });
}
