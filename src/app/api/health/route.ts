import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    app: "accelerate-core",
    phase: "foundation",
    status: "ok",
  });
}
