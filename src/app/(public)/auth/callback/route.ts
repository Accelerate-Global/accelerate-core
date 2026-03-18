import { NextResponse } from "next/server";

import { routes } from "@/lib/routes";

export function GET(request: Request) {
  return NextResponse.redirect(new URL(routes.login, request.url));
}
