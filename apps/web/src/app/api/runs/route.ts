import { NextResponse, type NextRequest } from "next/server";
import { CreateRunRequestSchema } from "@accelerate-core/shared";

function getApiBaseUrl(): string {
  const baseUrl = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) throw new Error("Missing API_BASE_URL / NEXT_PUBLIC_API_BASE_URL");
  return baseUrl.replace(/\/$/, "");
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth) return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const body = CreateRunRequestSchema.parse(json);

  const res = await fetch(`${getApiBaseUrl()}/runs`, {
    method: "POST",
    headers: {
      authorization: auth,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const data = await res.json().catch(async () => ({ error: await res.text() }));
  return NextResponse.json(data, { status: res.status });
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth) return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });

  const res = await fetch(`${getApiBaseUrl()}/runs`, {
    method: "GET",
    headers: {
      authorization: auth
    }
  });

  const data = await res.json().catch(async () => ({ error: await res.text() }));
  return NextResponse.json(data, { status: res.status });
}

