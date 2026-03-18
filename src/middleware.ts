import type { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/middleware";

export function middleware(request: NextRequest) {
  const middlewareClient = createClient(request);

  // Phase 2: call `middlewareClient.supabase.auth.getUser()` here.
  // Phase 2: add redirect logic here based on the authenticated user.
  return middlewareClient.getResponse();
}

export const config = {
  matcher: [
    "/((?!api/health$|health$|_next/static|_next/image|favicon\\.ico$|.*\\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|otf|map|webp|avif)$).*)",
  ],
};
