"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const getInternalPath = (value: string): string => {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/app";
  }

  return value;
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
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw error ?? new Error("Missing authenticated user.");
  }
};

const finalizeBrowserSession = async (): Promise<void> => {
  const finalizeResponse = await fetch("/api/auth/finalize", {
    credentials: "include",
    method: "POST",
  });

  if (!finalizeResponse.ok) {
    throw new Error("Failed to finalize session onboarding.");
  }
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
