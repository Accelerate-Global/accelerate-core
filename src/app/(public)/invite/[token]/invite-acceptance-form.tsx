"use client";

import { CheckCircle2, LoaderCircle, Mail, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { acceptInvite } from "@/lib/invite/actions";

type FormPhase = "idle" | "loading" | "success" | "error";

const DEFAULT_ERROR_MESSAGE =
  "We couldn’t process this invite right now. Please try again.";

interface InviteAcceptanceFormProps {
  email: string;
  token: string;
}

export const InviteAcceptanceForm = ({
  email,
  token,
}: InviteAcceptanceFormProps) => {
  const [phase, setPhase] = useState<FormPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();

    setPhase("loading");
    setErrorMessage(null);

    try {
      const result = await acceptInvite(token);

      if (result.status === "success") {
        setSuccessEmail(result.email);
        setPhase("success");

        return;
      }

      setErrorMessage(result.message || DEFAULT_ERROR_MESSAGE);
      setPhase("error");
    } catch {
      setErrorMessage(DEFAULT_ERROR_MESSAGE);
      setPhase("error");
    }
  };

  const handleReset = (): void => {
    setErrorMessage(null);
    setSuccessEmail(null);
    setPhase("idle");
  };

  const isSubmitting = phase === "loading";
  const isSuccess = phase === "success";
  const confirmedEmail = successEmail ?? email;

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
            {isSuccess ? "Check your email" : "You’re invited"}
          </CardTitle>
          <CardDescription className="max-w-md text-base leading-6">
            {isSuccess
              ? `We sent a magic link to ${confirmedEmail}. Open it to finish signing in and accept your invite.`
              : `This invite is for ${email}. Accept it to continue into Accelerate.`}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {isSuccess ? (
          <div aria-live="polite" className="space-y-4">
            <p className="rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-primary text-sm">
              Check {confirmedEmail} for your secure sign-in link.
            </p>
            <Button className="w-full" onClick={handleReset} type="button">
              Send another link
            </Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="rounded-md border border-border/80 bg-muted/30 px-4 py-3 text-left">
              <p className="font-medium text-sm">Invited email</p>
              <p className="mt-1 text-muted-foreground text-sm">{email}</p>
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
                Sending your invite sign-in link…
              </p>
            ) : null}

            <Button className="w-full" disabled={isSubmitting} type="submit">
              {isSubmitting ? (
                <>
                  <LoaderCircle aria-hidden="true" className="animate-spin" />
                  Sending invite link…
                </>
              ) : (
                <>
                  <Mail aria-hidden="true" />
                  Accept invite & sign in
                </>
              )}
            </Button>

            <p className="text-center text-muted-foreground text-sm">
              We&apos;ll send a magic link to verify your email.
            </p>
          </form>
        )}
      </CardContent>
      <CardFooter className="justify-center pt-0 text-center text-muted-foreground text-sm">
        Invite links are for the specific email address shown above.
      </CardFooter>
    </Card>
  );
};
