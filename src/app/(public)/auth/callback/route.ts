import { type NextRequest, NextResponse } from "next/server";

import { routes } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/middleware";

const copyResponseCookies = (
  sourceResponse: NextResponse,
  targetResponse: NextResponse
): void => {
  for (const { name, value, ...options } of sourceResponse.cookies.getAll()) {
    targetResponse.cookies.set(name, value, options);
  }
};

const expireResponseCookies = (
  sourceResponse: NextResponse,
  targetResponse: NextResponse
): void => {
  for (const { name, value: _value, ...options } of sourceResponse.cookies.getAll()) {
    targetResponse.cookies.set(name, "", {
      ...options,
      maxAge: 0,
    });
  }
};

const redirectToRoute = (
  request: NextRequest,
  route: string,
  sourceResponse?: NextResponse
): NextResponse => {
  const redirectResponse = NextResponse.redirect(new URL(route, request.url));

  if (sourceResponse) {
    copyResponseCookies(sourceResponse, redirectResponse);
  }

  return redirectResponse;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return redirectToRoute(request, routes.login);
  }

  const routeClient = createClient(request);
  const redirectWithAuthCookies = (route: string): NextResponse => {
    return redirectToRoute(request, route, routeClient.getResponse());
  };
  const signOutAndRedirectToSetupIncomplete = async (): Promise<NextResponse> => {
    const { error } = await routeClient.supabase.auth.signOut();
    const redirectResponse = redirectToRoute(
      request,
      routes.authSetupIncomplete
    );

    if (error) {
      expireResponseCookies(routeClient.getResponse(), redirectResponse);

      return redirectResponse;
    }

    copyResponseCookies(routeClient.getResponse(), redirectResponse);

    return redirectResponse;
  };
  const { data: exchangeData, error: exchangeError } =
    await routeClient.supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return redirectWithAuthCookies(routes.login);
  }

  const authenticatedUser = exchangeData.user ?? exchangeData.session?.user;
  const authenticatedEmail = authenticatedUser?.email;

  if (!authenticatedUser?.id || !authenticatedEmail) {
    return signOutAndRedirectToSetupIncomplete();
  }

  const adminClient = createAdminClient();

  try {
    const nowIso = new Date().toISOString();
    const { data: invite, error: inviteError } = await adminClient
      .from("invites")
      .select("id, app_role")
      .eq("email", authenticatedEmail)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (inviteError) {
      throw inviteError;
    }

    if (invite) {
      const { data: updatedProfile, error: profileError } = await adminClient
        .from("profiles")
        .update({
          app_role: invite.app_role,
          updated_at: nowIso,
        })
        .eq("id", authenticatedUser.id)
        .select("id")
        .maybeSingle();

      if (profileError || !updatedProfile) {
        return signOutAndRedirectToSetupIncomplete();
      }

      const { data: acceptedInvite, error: acceptInviteError } = await adminClient
        .from("invites")
        .update({
          accepted_at: nowIso,
        })
        .eq("id", invite.id)
        .select("id")
        .maybeSingle();

      if (acceptInviteError || !acceptedInvite) {
        return signOutAndRedirectToSetupIncomplete();
      }
    }
  } catch {
    return signOutAndRedirectToSetupIncomplete();
  }

  return redirectWithAuthCookies(routes.appHome);
}
