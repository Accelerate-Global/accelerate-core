import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { routes } from "@/lib/routes";
import { createMiddlewareSupabaseClient } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { getResponse, supabase } = createMiddlewareSupabaseClient(request);
  const response = getResponse();
  const pathname = request.nextUrl.pathname;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (pathname.startsWith(routes.appHome) && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = routes.login;
    loginUrl.search = "";

    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/app/:path*"],
};
