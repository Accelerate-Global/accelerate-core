import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requestMagicLinkLoginAction } from "@/features/auth/actions";
import { getCurrentUser } from "@/features/auth/server";
import { routes } from "@/lib/routes";

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const resolveStatus = (
  value: string | string[] | undefined
): "error" | "idle" | "sent" => {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (normalized === "sent") {
    return "sent";
  }

  if (normalized === "error") {
    return "error";
  }

  return "idle";
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect(routes.appHome);
  }

  const status = resolveStatus((await searchParams).status);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Enter your email to receive a magic link. Invite-only posture is
          enforced, so only existing authorized accounts can complete sign-in.
        </p>
        <form action={requestMagicLinkLoginAction} className="space-y-3">
          <label className="grid gap-2" htmlFor="login-email">
            <span className="font-medium text-sm">Email</span>
            <Input
              id="login-email"
              name="email"
              placeholder="you@example.com"
              required
              type="email"
            />
          </label>
          <Button className="w-full" type="submit">
            Send magic link
          </Button>
        </form>
        {status === "sent" ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800 text-sm">
            Check your email for a sign-in link.
          </p>
        ) : null}
        {status === "error" ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-sm">
            We could not start sign-in. Verify the email and try again.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
