import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  acceptInviteWithCurrentSessionAction,
  signOutFromInviteConflictAction,
  startInviteMagicLinkAction,
} from "@/features/auth/actions";
import {
  getCurrentUser,
  isSameEmailUser,
  resolveInviteToken,
} from "@/features/auth/server";
import { routes } from "@/lib/routes";

interface InvitePageProps {
  params: Promise<{
    token: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface InvitePageViewProps {
  inviteEmail: string | null;
  sameEmailSignedIn: boolean;
  signedInEmail: string | null;
  state: Awaited<ReturnType<typeof resolveInviteToken>>["state"];
  status: "error" | "idle" | "sent" | "signed-out";
  token: string;
  userIsSignedIn: boolean;
}

const resolveStatus = (
  value: string | string[] | undefined
): "error" | "idle" | "sent" | "signed-out" => {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (normalized === "sent") {
    return "sent";
  }

  if (normalized === "error") {
    return "error";
  }

  if (normalized === "signed-out") {
    return "signed-out";
  }

  return "idle";
};

const InviteStatusBanner = ({
  status,
}: Pick<InvitePageViewProps, "status">) => {
  if (status === "signed-out") {
    return (
      <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800 text-sm">
        Signed out. Continue invite onboarding with the invited email.
      </p>
    );
  }

  if (status === "sent") {
    return (
      <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800 text-sm">
        Magic link sent. Check your email to continue onboarding.
      </p>
    );
  }

  if (status === "error") {
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-sm">
        We could not continue this invite flow. Try again or contact an admin.
      </p>
    );
  }

  return null;
};

const InviteResolutionBanner = ({
  state,
}: Pick<InvitePageViewProps, "state">) => {
  if (state === "invalid") {
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-sm">
        This invite link is invalid.
      </p>
    );
  }

  if (state === "expired") {
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-sm">
        This invite has expired. Ask an admin to issue a new invite.
      </p>
    );
  }

  if (state === "revoked") {
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-sm">
        This invite was revoked by an administrator.
      </p>
    );
  }

  if (state === "accepted") {
    return (
      <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800 text-sm">
        This invite was already accepted. Use login to access the app.
      </p>
    );
  }

  return null;
};

const InvitePendingActions = ({
  inviteEmail,
  sameEmailSignedIn,
  signedInEmail,
  token,
  userIsSignedIn,
}: Pick<
  InvitePageViewProps,
  | "inviteEmail"
  | "sameEmailSignedIn"
  | "signedInEmail"
  | "token"
  | "userIsSignedIn"
>) => {
  if (!inviteEmail) {
    return null;
  }

  if (userIsSignedIn && !sameEmailSignedIn) {
    return (
      <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-amber-900 text-sm">
        <p>
          You are signed in as{" "}
          <span className="font-medium">
            {signedInEmail ?? "another account"}
          </span>
          , but this invite belongs to{" "}
          <span className="font-medium">{inviteEmail}</span>.
        </p>
        <div className="flex gap-2">
          <form action={signOutFromInviteConflictAction}>
            <input name="token" type="hidden" value={token} />
            <Button type="submit" variant="outline">
              Sign out and continue
            </Button>
          </form>
          <Button asChild variant="ghost">
            <Link href={routes.appHome}>Return to app</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {userIsSignedIn && sameEmailSignedIn ? (
        <form action={acceptInviteWithCurrentSessionAction}>
          <input name="token" type="hidden" value={token} />
          <Button className="w-full" type="submit">
            Continue with current session
          </Button>
        </form>
      ) : null}
      <form action={startInviteMagicLinkAction}>
        <input name="token" type="hidden" value={token} />
        <Button className="w-full" type="submit" variant="outline">
          {userIsSignedIn ? "Send magic link again" : "Send magic link"}
        </Button>
      </form>
    </div>
  );
};

const InvitePageView = ({
  inviteEmail,
  sameEmailSignedIn,
  signedInEmail,
  state,
  status,
  token,
  userIsSignedIn,
}: InvitePageViewProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Accept invite</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {inviteEmail ? (
          <p className="text-muted-foreground text-sm">
            Invite email:{" "}
            <span className="font-medium text-foreground">{inviteEmail}</span>
          </p>
        ) : null}
        <InviteStatusBanner status={status} />
        <InviteResolutionBanner state={state} />
        {state === "pending" ? (
          <InvitePendingActions
            inviteEmail={inviteEmail}
            sameEmailSignedIn={sameEmailSignedIn}
            signedInEmail={signedInEmail}
            token={token}
            userIsSignedIn={userIsSignedIn}
          />
        ) : null}
      </CardContent>
    </Card>
  );
};

export default async function InvitePage({
  params,
  searchParams,
}: InvitePageProps) {
  const token = (await params).token?.trim();

  if (!token) {
    redirect(routes.login);
  }

  const [user, resolution, queryParams] = await Promise.all([
    getCurrentUser(),
    resolveInviteToken(token),
    searchParams,
  ]);
  const invite = resolution.invite;

  return (
    <InvitePageView
      inviteEmail={invite?.email ?? null}
      sameEmailSignedIn={invite ? isSameEmailUser(user, invite) : false}
      signedInEmail={user?.email ?? null}
      state={resolution.state}
      status={resolveStatus(queryParams.status)}
      token={token}
      userIsSignedIn={Boolean(user)}
    />
  );
}
