import { type NextRequest } from "next/server";
import { CreateResourceRequestSchema } from "@accelerate-core/shared";
import { proxyJsonToApi } from "./_lib/proxy";

export async function GET(req: NextRequest) {
  return proxyJsonToApi({
    req,
    method: "GET",
    path: "/resources"
  });
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const body = CreateResourceRequestSchema.parse(json);

  return proxyJsonToApi({
    req,
    method: "POST",
    path: "/resources",
    body
  });
}
