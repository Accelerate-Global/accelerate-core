"use client";

import Link from "next/link";
import { LoaderCircle, TriangleAlert, User } from "lucide-react";
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
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/client";

interface InviteConflictProps {
  currentEmail: string;
}

const DEFAULT_ERROR_MESSAGE =
  "We couldn’t sign you out right now. Please try again.";

export const InviteConflict = ({ currentEmail }: InviteConflictProps) => {
  const [supabase] = useState(() => createClient());
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignOut = async (): Promise<void> => {
    setIsSigningOut(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        setErrorMessage(error.message || DEFAULT_ERROR_MESSAGE);
        setIsSigningOut(false);

        return;
      }

      window.location.reload();
    } catch {
      setErrorMessage(DEFAULT_ERROR_MESSAGE);
      setIsSigningOut(false);
    }
  };

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="items-center space-y-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User aria-hidden="true" className="size-5" />
        </div>
        <div className="space-y-2">
          <CardTitle className="text-2xl tracking-tight">
            Already signed in
          </CardTitle>
          <CardDescription className="max-w-md text-base leading-6">
            You&apos;re currently signed in as{" "}
            <span className="font-medium text-foreground">{currentEmail}</span>.
            To accept this invite, you&apos;ll need to sign out first.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMessage ? (
          <p
            className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/5 px-4 py-3 text-destructive text-sm"
            role="alert"
          >
            <TriangleAlert
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0"
            />
            <span>{errorMessage}</span>
          </p>
        ) : null}

        <Button className="w-full" disabled={isSigningOut} onClick={handleSignOut}>
          {isSigningOut ? (
            <>
              <LoaderCircle aria-hidden="true" className="animate-spin" />
              Signing out…
            </>
          ) : (
            "Sign out and continue with invite"
          )}
        </Button>
      </CardContent>
      <CardFooter className="justify-center pt-0">
        <Button asChild variant="outline">
          <Link href={routes.appHome}>Go to app</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};
