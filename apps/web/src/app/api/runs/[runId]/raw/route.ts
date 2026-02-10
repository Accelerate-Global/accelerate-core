import { NextResponse, type NextRequest } from "next/server";

function getApiBaseUrl(): string {
  const baseUrl = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) throw new Error("Missing API_BASE_URL / NEXT_PUBLIC_API_BASE_URL");
  return baseUrl.replace(/\/$/, "");
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ runId: string }> }) {
  const auth = req.headers.get("authorization");
  if (!auth) return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });

  const { runId } = await ctx.params;

  const res = await fetch(`${getApiBaseUrl()}/runs/${encodeURIComponent(runId)}/raw`, {
    method: "GET",
    headers: {
      authorization: auth
    }
  });

  if (!res.ok) {
    const data = await res.json().catch(async () => ({ error: await res.text() }));
    return NextResponse.json(data, { status: res.status });
  }

  const headers = new Headers();
  const contentType = res.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const contentDisposition = res.headers.get("content-disposition");
  if (contentDisposition) headers.set("content-disposition", contentDisposition);

  return new NextResponse(res.body, { status: 200, headers });
}

