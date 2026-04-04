import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { requestMagicLinkLoginAction } from "@/features/auth/actions";
import { LoginFormFields } from "@/features/auth/login-form-fields";
import { getCurrentUser } from "@/features/auth/server";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

type LoginStatus = "cooldown" | "error" | "idle" | "not-provisioned" | "sent";

export const metadata: Metadata = {
  title: "Login",
};

const resolveStatus = (value: string | string[] | undefined): LoginStatus => {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (normalized === "sent") {
    return "sent";
  }

  if (normalized === "cooldown") {
    return "cooldown";
  }

  if (normalized === "not-provisioned") {
    return "not-provisioned";
  }

  if (normalized === "error") {
    return "error";
  }

  return "idle";
};

const loginTrustNotes = [
  {
    description:
      "Only invited or already authorized collaborators can receive a secure sign-in link.",
    title: "Protected access",
  },
  {
    description:
      "No password required. The email tied to your account receives a one-time link.",
    title: "Secure by design",
  },
] as const;

interface LoginStatusPanelProps {
  status: LoginStatus;
}

const LoginStatusPanel = ({ status }: LoginStatusPanelProps) => {
  if (status === "idle") {
    return null;
  }

  const isSuccess = status === "sent";
  let content = {
    description:
      "Confirm the email address and try again. If access was recently granted, wait a moment and retry or contact the Accelerate team member who invited you.",
    title: "We couldn’t start sign-in",
  };

  if (status === "sent") {
    content = {
      description:
        "If the address is authorized, a one-time sign-in link is on the way. Give it a minute, and check spam or promotions if it does not appear.",
      title: "Check your email",
    };
  }

  if (status === "cooldown") {
    content = {
      description:
        "A recent sign-in link request is still cooling down. Wait a moment before retrying, then check your inbox, spam, or promotions tabs for the latest message.",
      title: "Please wait before retrying",
    };
  }

  if (status === "not-provisioned") {
    content = {
      description:
        "This sign-in only works for emails already provisioned for the workspace. If access was just granted, wait a moment and retry, or ask the Accelerate administrator to confirm your account is ready.",
      title: "This email is not provisioned yet",
    };
  }

  return (
    <section
      className={cn(
        "rounded-2xl border px-4 py-4 sm:px-5",
        isSuccess
          ? "border-emerald-200 bg-emerald-50 text-emerald-950"
          : "border-destructive/20 bg-destructive/10 text-destructive"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full",
            isSuccess
              ? "bg-emerald-100 text-emerald-700"
              : "bg-destructive/15 text-destructive"
          )}
        >
          {isSuccess ? (
            <CheckCircle2 aria-hidden="true" className="size-5" />
          ) : (
            <AlertTriangle aria-hidden="true" className="size-5" />
          )}
        </div>
        <div className="space-y-2">
          <h3 className="font-medium text-base tracking-tight">
            {content.title}
          </h3>
          <p className="text-sm leading-6">{content.description}</p>
          {isSuccess ? (
            <Button asChild size="sm" variant="outline">
              <Link href={routes.login}>
                Use a different email
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect(routes.appHome);
  }

  const status = resolveStatus((await searchParams).status);

  return (
    <Card className="border-[#262531]/10 bg-white/[0.94] py-0 shadow-[0_24px_90px_rgba(38,37,49,0.10)] backdrop-blur-sm">
      <CardHeader className="space-y-4 px-6 pt-6 sm:px-8 sm:pt-8">
        <div className="flex flex-wrap items-center gap-3">
          <p className="inline-flex rounded-full bg-[#cad3b8] px-3 py-1 font-medium text-[#262531] text-xs uppercase tracking-[0.18em]">
            Invite-only access
          </p>
        </div>
        <div className="space-y-3">
          <h2 className="font-semibold text-3xl text-[#262531] tracking-[-0.04em] sm:text-4xl">
            Sign in to your Accelerate Global workspace
          </h2>
          <CardDescription className="max-w-xl text-[#262531]/72 text-sm leading-7 sm:text-[15px]">
            Use the same email address you were invited with or your existing
            account. We will send a one-time sign-in link so you can continue
            into your workspace.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 px-6 pb-6 sm:px-8 sm:pb-8">
        <LoginStatusPanel status={status} />
        {status === "sent" ? null : (
          <form action={requestMagicLinkLoginAction} className="space-y-4">
            <LoginFormFields />
          </form>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {loginTrustNotes.map((note) => (
            <div
              className="rounded-2xl border border-[#262531]/10 bg-[#f7f6ef]/80 p-4"
              key={note.title}
            >
              <h3 className="font-medium text-[#262531] text-sm uppercase tracking-[0.12em]">
                {note.title}
              </h3>
              <p className="mt-2 text-[#262531]/68 text-sm leading-6">
                {note.description}
              </p>
            </div>
          ))}
        </div>
        <p className="text-[#262531]/68 text-sm leading-6">
          Need access but do not have an invite yet? Contact the Accelerate
          Global administrator.
        </p>
      </CardContent>
    </Card>
  );
}
