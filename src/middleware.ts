import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { routes } from "@/lib/routes";
import type { Database } from "@/lib/supabase/database.types";
import { createMiddlewareSupabaseClient } from "@/lib/supabase/middleware";

const copyAuthCookiesOntoRedirect = (
  sessionResponse: NextResponse,
  redirectResponse: NextResponse
): void => {
  const setCookieLines =
    typeof sessionResponse.headers.getSetCookie === "function"
      ? sessionResponse.headers.getSetCookie()
      : [];

  if (setCookieLines.length > 0) {
    for (const line of setCookieLines) {
      redirectResponse.headers.append("Set-Cookie", line);
    }

    return;
  }

  for (const cookie of sessionResponse.cookies.getAll()) {
    redirectResponse.cookies.set(cookie.name, cookie.value);
  }
};

const exchangePkceAtAuthCallback = async (
  request: NextRequest,
  getResponse: () => NextResponse,
  supabase: SupabaseClient<Database>
): Promise<NextResponse | null> => {
  if (request.nextUrl.pathname !== routes.authCallback) {
    return null;
  }

  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return null;
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = routes.login;
    loginUrl.search = "";
    loginUrl.searchParams.set("error", "auth_callback");

    return NextResponse.redirect(loginUrl);
  }

  const sessionResponse = getResponse();
  const continueUrl = request.nextUrl.clone();
  continueUrl.searchParams.delete("code");

  const redirectResponse = NextResponse.redirect(continueUrl);
  copyAuthCookiesOntoRedirect(sessionResponse, redirectResponse);

  return redirectResponse;
};

export async function middleware(request: NextRequest) {
  const { getResponse, supabase } = createMiddlewareSupabaseClient(request);
  const pathname = request.nextUrl.pathname;

  const pkceRedirect = await exchangePkceAtAuthCallback(
    request,
    getResponse,
    supabase
  );

  if (pkceRedirect) {
    return pkceRedirect;
  }

  const response = getResponse();
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
  matcher: ["/app/:path*", "/auth/callback"],
};
