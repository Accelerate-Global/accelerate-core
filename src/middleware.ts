import type { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/middleware";

export function middleware(request: NextRequest) {
  const middlewareClient = createClient(request);

  // Phase 2: call `middlewareClient.supabase.auth.getUser()` here.
  // Phase 2: add redirect logic here based on the authenticated user.
  return middlewareClient.getResponse();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|api/health).*)"],
};
