import { NextResponse } from "next/server";

export function middleware() {
  // Phase 2: create the Supabase middleware client here and add auth/session checks.
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/health$|health$|_next/static|_next/image|.*\\..*$).*)"],
};
