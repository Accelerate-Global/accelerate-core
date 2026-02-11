import { type NextRequest } from "next/server";
import { PatchResourceCurrentVersionRequestSchema } from "@accelerate-core/shared";
import { proxyJsonToApi } from "../../_lib/proxy";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ resourceSlug: string }> }) {
  const { resourceSlug } = await ctx.params;
  const json = await req.json().catch(() => null);
  const body = PatchResourceCurrentVersionRequestSchema.parse(json);
  return proxyJsonToApi({
    req,
    method: "PATCH",
    path: `/resources/${encodeURIComponent(resourceSlug)}/current`,
    body
  });
}
