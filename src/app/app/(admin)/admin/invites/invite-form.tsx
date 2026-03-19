"use client";

import { Check, Copy, Link, LoaderCircle, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createInvite } from "@/lib/invite/actions";

type InviteFormPhase =
  | "idle"
  | "loading"
  | "success"
  | "existing_user"
  | "error";

const DEFAULT_ERROR_MESSAGE = "Something went wrong. Please try again.";

export const InviteForm = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [phase, setPhase] = useState<InviteFormPhase>("idle");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const clearFeedbackState = (): void => {
    setPhase("idle");
    setInviteUrl(null);
    setMessage(null);
    setCopied(false);
  };

  const handleStartAnotherInvite = (): void => {
    setEmail("");
    setRole("user");
    clearFeedbackState();
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();

    setPhase("loading");
    setInviteUrl(null);
    setMessage(null);
    setCopied(false);

    try {
      const formData = new FormData();

      formData.set("email", email);
      formData.set("role", role);

      const result = await createInvite(formData);

      if (result.status === "success") {
        setPhase("success");
        setInviteUrl(result.inviteUrl);
        setMessage(null);
        router.refresh();

        return;
      }

      if (result.status === "existing_user") {
        setPhase("existing_user");
        setInviteUrl(null);
        setMessage(result.message);

        return;
      }

      setPhase("error");
      setInviteUrl(null);
      setMessage(result.message);
    } catch {
      setPhase("error");
      setInviteUrl(null);
      setMessage(DEFAULT_ERROR_MESSAGE);
    }
  };

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setEmail(event.currentTarget.value);

    if (phase === "existing_user" || phase === "error") {
      clearFeedbackState();
    }
  };

  const handleRoleChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    setRole(event.currentTarget.value as "user" | "admin");

    if (phase === "error") {
      clearFeedbackState();
    }
  };

  const handleCopyLink = async (): Promise<void> => {
    if (!inviteUrl) {
      return;
    }

    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const isSubmitting = phase === "loading";
  const hasInviteLink = phase === "success" && inviteUrl !== null;
  const isFormDisabled = isSubmitting || hasInviteLink;

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle>Invite a user</CardTitle>
        <CardDescription>
          Send an invite link to grant someone access. The link expires in 48
          hours.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasInviteLink ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-950">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <Link aria-hidden="true" className="size-4" />
                  Invite link created
                </div>
                <p className="truncate rounded-md bg-white/80 px-3 py-2 font-mono text-sm">
                  {inviteUrl}
                </p>
              </div>
              <div className="flex gap-2 sm:self-start">
                <Button
                  onClick={() => {
                    handleCopyLink().catch(() => {
                      setCopied(false);
                    });
                  }}
                  type="button"
                  variant="outline"
                >
                  {copied ? (
                    <Check aria-hidden="true" className="size-4" />
                  ) : (
                    <Copy aria-hidden="true" className="size-4" />
                  )}
                  {copied ? "Copied!" : "Copy link"}
                </Button>
                <Button onClick={handleStartAnotherInvite} type="button">
                  Start another invite
                </Button>
              </div>
            </div>
            <p className="mt-3 text-green-900/80 text-sm">
              This link can only be shown once. Copy it now and send it to the
              invitee.
            </p>
          </div>
        ) : null}

        {phase === "existing_user" && message ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-blue-950 text-sm">
            {message}
          </div>
        ) : null}

        {phase === "error" && message ? (
          <div
            aria-live="polite"
            className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/5 px-4 py-3 text-destructive text-sm"
            role="alert"
          >
            <TriangleAlert
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0"
            />
            <span>{message}</span>
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1 space-y-2">
              <label className="font-medium text-sm" htmlFor="invite-email">
                Email address
              </label>
              <input
                autoComplete="email"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                disabled={isFormDisabled}
                id="invite-email"
                onChange={handleEmailChange}
                placeholder="colleague@company.com"
                type="email"
                value={email}
              />
            </div>

            <div className="w-full space-y-2 md:w-44">
              <label className="font-medium text-sm" htmlFor="invite-role">
                Role
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                disabled={isFormDisabled}
                id="invite-role"
                onChange={handleRoleChange}
                value={role}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <Button disabled={isFormDisabled} type="submit">
              {isSubmitting ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 animate-spin"
                />
              ) : null}
              Create invite
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
