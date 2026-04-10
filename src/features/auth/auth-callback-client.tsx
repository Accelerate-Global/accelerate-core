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

      // #region agent log
      const failMsg = await getFinalizeErrorMessage(finalizeResponse);
      fetch(
        "http://127.0.0.1:7415/ingest/07b71db7-16df-4bc6-97e9-ca1555981d7e",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "3fada2",
          },
          body: JSON.stringify({
            sessionId: "3fada2",
            runId: "pre-fix",
            hypothesisId: "H5",
            location: "auth-callback-client.tsx:finalizeBrowserSession",
            message: "finalize API not ok",
            data: {
              httpStatus: finalizeResponse.status,
              messageSnippet: failMsg.slice(0, 160),
            },
            timestamp: Date.now(),
          }),
        }
      ).catch(() => undefined);
      lastError = new Error(failMsg);
      // #endregion
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
      // #region agent log
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      fetch(
        "http://127.0.0.1:7415/ingest/07b71db7-16df-4bc6-97e9-ca1555981d7e",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "3fada2",
          },
          body: JSON.stringify({
            sessionId: "3fada2",
            runId: "pre-fix",
            hypothesisId: "H1",
            location: "auth-callback-client.tsx:run:start",
            message: "callback path selection",
            data: {
              hasAuthCode: Boolean(authCode),
              hasHashAccessToken: hashParams.has("access_token"),
              hasHashRefreshToken: hashParams.has("refresh_token"),
            },
            timestamp: Date.now(),
          }),
        }
      ).catch(() => undefined);
      // #endregion

      try {
        if (authCode) {
          await exchangeCodeForBrowserSession(authCode);
        } else {
          await maybeSetSessionFromHash();
        }

        await ensureAuthenticatedBrowserSession();

        // #region agent log
        const supabaseAfter = createBrowserSupabaseClient();
        const { data: userCheck } = await supabaseAfter.auth.getUser();
        fetch(
          "http://127.0.0.1:7415/ingest/07b71db7-16df-4bc6-97e9-ca1555981d7e",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Debug-Session-Id": "3fada2",
            },
            body: JSON.stringify({
              sessionId: "3fada2",
              runId: "pre-fix",
              hypothesisId: "H2",
              location: "auth-callback-client.tsx:run:after-session",
              message: "browser session before finalize",
              data: { hasUser: Boolean(userCheck.user) },
              timestamp: Date.now(),
            }),
          }
        ).catch(() => undefined);
        // #endregion

        await finalizeBrowserSession();

        // #region agent log
        fetch(
          "http://127.0.0.1:7415/ingest/07b71db7-16df-4bc6-97e9-ca1555981d7e",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Debug-Session-Id": "3fada2",
            },
            body: JSON.stringify({
              sessionId: "3fada2",
              runId: "pre-fix",
              hypothesisId: "H3",
              location: "auth-callback-client.tsx:run:finalize-ok",
              message: "finalize completed",
              data: { ok: true },
              timestamp: Date.now(),
            }),
          }
        ).catch(() => undefined);
        // #endregion

        if (!isCancelled) {
          router.replace(getInternalPath(nextPath));
        }
      } catch (error) {
        // #region agent log
        const errMsg =
          error instanceof Error ? error.message : "non-error throw";
        fetch(
          "http://127.0.0.1:7415/ingest/07b71db7-16df-4bc6-97e9-ca1555981d7e",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Debug-Session-Id": "3fada2",
            },
            body: JSON.stringify({
              sessionId: "3fada2",
              runId: "pre-fix",
              hypothesisId: "H4",
              location: "auth-callback-client.tsx:run:catch",
              message: "callback flow error",
              data: {
                errorSnippet: errMsg.slice(0, 200),
              },
              timestamp: Date.now(),
            }),
          }
        ).catch(() => undefined);
        // #endregion

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
