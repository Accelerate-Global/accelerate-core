import { NextResponse, type NextRequest } from "next/server";

export function getApiBaseUrl(): string {
  const baseUrl = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) throw new Error("Missing API_BASE_URL / NEXT_PUBLIC_API_BASE_URL");
  return baseUrl.replace(/\/$/, "");
}

type ProxyRequest = {
  req: NextRequest;
  path: string;
  method: "GET" | "POST" | "PATCH";
  body?: unknown;
};

export async function proxyJsonToApi(input: ProxyRequest): Promise<NextResponse> {
  const auth = input.req.headers.get("authorization");
  if (!auth) return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });

  const res = await fetch(`${getApiBaseUrl()}${input.path}`, {
    method: input.method,
    headers: {
      authorization: auth,
      ...(typeof input.body === "undefined" ? {} : { "content-type": "application/json" })
    },
    ...(typeof input.body === "undefined" ? {} : { body: JSON.stringify(input.body) })
  });

  const data = await res.json().catch(async () => ({ error: await res.text() }));
  return NextResponse.json(data, { status: res.status });
}
