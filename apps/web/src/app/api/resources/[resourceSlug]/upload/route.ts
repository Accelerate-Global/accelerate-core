import { type NextRequest } from "next/server";
import { UploadResourceVersionRequestSchema } from "@accelerate-core/shared";
import { proxyJsonToApi } from "../../_lib/proxy";

const MAX_UPLOAD_BYTES = Number(process.env.RESOURCE_CSV_MAX_BYTES ?? "5000000");

export async function POST(req: NextRequest, ctx: { params: Promise<{ resourceSlug: string }> }) {
  const { resourceSlug } = await ctx.params;

  const contentType = req.headers.get("content-type") ?? "";
  let body: unknown = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Missing CSV file upload" }, { status: 400 });
    }
    if (file.size <= 0) {
      return Response.json({ error: "Uploaded CSV is empty" }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return Response.json(
        { error: `CSV exceeds max size (${file.size} bytes > ${MAX_UPLOAD_BYTES} bytes)` },
        { status: 413 }
      );
    }
    const csvText = await file.text();
    body = { csvText, fileName: file.name };
  } else {
    const json = await req.json().catch(() => null);
    body = UploadResourceVersionRequestSchema.parse(json);
  }

  const parsed = UploadResourceVersionRequestSchema.parse(body);
  return proxyJsonToApi({
    req,
    method: "POST",
    path: `/resources/${encodeURIComponent(resourceSlug)}/upload`,
    body: parsed
  });
}
