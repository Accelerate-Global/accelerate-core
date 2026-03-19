"use client";

import { CheckCircle2, LoaderCircle, Mail, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signInWithMagicLink } from "@/lib/auth/actions";
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/client";

type FormPhase = "idle" | "loading" | "success" | "error";

const DEFAULT_ERROR_MESSAGE =
  "We couldn’t send a magic link right now. Please try again.";

export const LoginForm = () => {
  const [supabase] = useState(() => createClient());
  const [emailAddress, setEmailAddress] = useState("");
  const [phase, setPhase] = useState<FormPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const redirectToApp = (): void => {
      window.location.replace(routes.appHome);
    };

    const syncSession = async (): Promise<void> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        redirectToApp();
      }
    };

    syncSession().catch(() => {
      return undefined;
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        redirectToApp();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();

    const normalizedEmailAddress = emailAddress.trim().toLowerCase();

    if (!normalizedEmailAddress) {
      return;
    }

    setPhase("loading");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();

      formData.set("email", normalizedEmailAddress);

      const result = await signInWithMagicLink(formData);

      if (result.status === "success") {
        setPhase("success");
        setSuccessMessage(result.message);

        return;
      }

      setPhase("error");
      setErrorMessage(result.message || DEFAULT_ERROR_MESSAGE);
    } catch {
      setPhase("error");
      setErrorMessage(DEFAULT_ERROR_MESSAGE);
    }
  };

  const handleEmailAddressChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    setEmailAddress(event.currentTarget.value);

    if (phase === "error") {
      setErrorMessage(null);
      setPhase("idle");
    }
  };

  const handleReset = (): void => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setPhase("idle");
  };

  const isSubmitting = phase === "loading";
  const isSuccess = phase === "success";
  const statusMessage =
    successMessage ??
    "If the email address matches an Accelerate account, you’ll receive a secure sign-in link shortly.";

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="items-center space-y-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          {isSuccess ? (
            <CheckCircle2 aria-hidden="true" className="size-5" />
          ) : (
            <Mail aria-hidden="true" className="size-5" />
          )}
        </div>
        <div className="space-y-2">
          <CardTitle className="text-2xl tracking-tight">
            {isSuccess ? "Check your inbox" : "Sign in with a magic link"}
          </CardTitle>
          <CardDescription className="max-w-md text-base leading-6">
            {isSuccess
              ? statusMessage
              : "Enter the email address associated with your account and we’ll send a secure sign-in link."}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {isSuccess ? (
          <div aria-live="polite" className="space-y-4">
            <p className="rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-primary text-sm">
              For security, we always show the same confirmation message even
              when an email address is not recognized.
            </p>
            <Button className="w-full" onClick={handleReset} type="button">
              Send another link
            </Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="font-medium text-sm" htmlFor="email-address">
                Email address
              </label>
              <input
                aria-describedby="email-address-help"
                autoComplete="email"
                autoFocus
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                disabled={isSubmitting}
                id="email-address"
                name="email"
                onChange={handleEmailAddressChange}
                placeholder="you@company.com"
                required
                type="email"
                value={emailAddress}
              />
              <p
                className="text-muted-foreground text-sm"
                id="email-address-help"
              >
                Use the email address tied to your Accelerate account.
              </p>
            </div>

            {phase === "error" ? (
              <p
                className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/5 px-4 py-3 text-destructive text-sm"
                role="alert"
              >
                <TriangleAlert
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0"
                />
                <span>{errorMessage ?? DEFAULT_ERROR_MESSAGE}</span>
              </p>
            ) : null}

            {isSubmitting ? (
              <p
                aria-live="polite"
                className="flex items-center gap-2 text-muted-foreground text-sm"
                role="status"
              >
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 animate-spin"
                />
                Sending your magic link…
              </p>
            ) : null}

            <Button className="w-full" disabled={isSubmitting} type="submit">
              {isSubmitting ? (
                <>
                  <LoaderCircle aria-hidden="true" className="animate-spin" />
                  Sending magic link…
                </>
              ) : (
                <>
                  <Mail aria-hidden="true" />
                  Send magic link
                </>
              )}
            </Button>
          </form>
        )}
      </CardContent>
      <CardFooter className="justify-center pt-0 text-center text-muted-foreground text-sm">
        Magic links are for returning users with an existing Accelerate account.
      </CardFooter>
    </Card>
  );
};
