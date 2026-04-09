import { AuthCallbackClient } from "@/features/auth/auth-callback-client";
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
  const nextPath = getSafeNextPath(readParam(params.next, routes.appHome));
  const authCode = readParam(params.code);

  return (
    <AuthCallbackClient authCode={authCode || undefined} nextPath={nextPath} />
  );
}
