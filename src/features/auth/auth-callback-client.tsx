"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const AUTH_SESSION_ATTEMPT_DELAYS_MS = [0, 100, 250, 500] as const;
const FINALIZE_ATTEMPT_DELAYS_MS = [0, 150, 350, 700] as const;

const getInternalPath = (value: string): string => {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/app";
  }

  return value;
};

const wait = async (delayMs: number): Promise<void> => {
  if (delayMs === 0) {
    return;
  }

  await new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
};

interface AuthCallbackClientProps {
  authCode?: string;
  nextPath: string;
}

const exchangeCodeForBrowserSession = async (
  authCode: string
): Promise<void> => {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(authCode);

  if (error) {
    throw error;
  }
};

const maybeSetSessionFromHash = async (): Promise<void> => {
  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");

  if (!(accessToken && refreshToken)) {
    return;
  }

  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    throw error;
  }
};

const ensureAuthenticatedBrowserSession = async (): Promise<void> => {
  const supabase = createBrowserSupabaseClient();
  let lastError: Error | null = null;

  for (const delayMs of AUTH_SESSION_ATTEMPT_DELAYS_MS) {
    await wait(delayMs);

    const { data, error } = await supabase.auth.getUser();

    if (data.user) {
      return;
    }

    if (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Missing authenticated user.");
};

const getFinalizeErrorMessage = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { message?: string };

    if (typeof body.message === "string" && body.message.trim()) {
      return body.message;
    }
  } catch {
    // Ignore non-JSON error bodies and fall through to a generic message.
  }

  return `Finalization failed with status ${response.status}.`;
};

const finalizeBrowserSession = async (): Promise<void> => {
  let lastError: Error | null = null;

  for (const delayMs of FINALIZE_ATTEMPT_DELAYS_MS) {
    await wait(delayMs);

    try {
      const finalizeResponse = await fetch("/api/auth/finalize", {
        credentials: "include",
        method: "POST",
      });

      if (finalizeResponse.ok) {
        return;
      }

      lastError = new Error(await getFinalizeErrorMessage(finalizeResponse));
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error("Failed to finalize session onboarding.");
    }
  }

  throw lastError ?? new Error("Failed to finalize session onboarding.");
};

export const AuthCallbackClient = ({
  authCode,
  nextPath,
}: AuthCallbackClientProps) => {
  const router = useRouter();

  useEffect(() => {
    let isCancelled = false;

    const run = async () => {
      try {
        if (authCode) {
          await exchangeCodeForBrowserSession(authCode);
        } else {
          await maybeSetSessionFromHash();
        }

        await ensureAuthenticatedBrowserSession();
        await finalizeBrowserSession();

        if (!isCancelled) {
          router.replace(getInternalPath(nextPath));
        }
      } catch {
        if (!isCancelled) {
          router.replace("/auth/setup-incomplete");
        }
      }
    };

    run();

    return () => {
      isCancelled = true;
    };
  }, [authCode, nextPath, router]);

  return (
    <p className="rounded-lg border bg-muted/30 px-4 py-3 text-muted-foreground text-sm">
      Completing sign-in...
    </p>
  );
};
