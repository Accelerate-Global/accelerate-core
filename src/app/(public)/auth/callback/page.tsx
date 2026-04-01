import { redirect } from "next/navigation";

import { AuthCallbackClient } from "@/features/auth/auth-callback-client";
import {
  exchangeCodeForSession,
  finalizeSessionOnboarding,
  getCurrentUser,
} from "@/features/auth/server";
import { routes } from "@/lib/routes";

interface AuthCallbackPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const readParam = (
  value: string | string[] | undefined,
  fallback = ""
): string => {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? fallback;
  }

  return value?.trim() ?? fallback;
};

const getSafeNextPath = (value: string): string => {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return routes.appHome;
  }

  return value;
};

export default async function AuthCallbackPage({
  searchParams,
}: AuthCallbackPageProps) {
  const params = await searchParams;
  const code = readParam(params.code);
  const nextPath = getSafeNextPath(readParam(params.next, routes.appHome));

  if (!code) {
    return <AuthCallbackClient nextPath={nextPath} />;
  }

  try {
    await exchangeCodeForSession(code);
    const user = await getCurrentUser();

    if (!user) {
      redirect(`${routes.login}?status=error`);
    }

    await finalizeSessionOnboarding(user);
  } catch {
    redirect(routes.authSetupIncomplete);
  }

  redirect(nextPath);
}
