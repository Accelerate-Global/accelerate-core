import { NextResponse, type NextRequest } from "next/server";

import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const middlewareClient = createClient(request);
  const {
    data: { user },
  } = await middlewareClient.supabase.auth.getUser();
  const response = middlewareClient.getResponse();
  const { pathname } = request.nextUrl;
  const isAppRoute =
    pathname === routes.appHome || pathname.startsWith(`${routes.appHome}/`);

  if (!user && isAppRoute) {
    const url = new URL(routes.login, request.url);
    const redirectResponse = NextResponse.redirect(url);

    for (const { name, value, ...options } of response.cookies.getAll()) {
      redirectResponse.cookies.set(name, value, options);
    }

    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|api/health).*)"],
};
