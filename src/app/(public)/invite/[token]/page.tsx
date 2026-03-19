import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import type { ValidatedInvite } from "@/lib/invite/types";
import { hashToken } from "@/lib/invite/utils";
import { routes } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/admin";

import { InviteAcceptanceForm } from "./invite-acceptance-form";
import { InviteConflict } from "./invite-conflict";

const INVALID_INVITE_MESSAGE = "This invite link is not valid.";
const USED_INVITE_MESSAGE = "This invite has already been used. Sign in instead.";
const REVOKED_INVITE_MESSAGE = "This invite has been revoked.";
const EXPIRED_INVITE_MESSAGE =
  "This invite has expired. Ask your administrator for a new one.";

const InviteErrorState = ({ description }: { description: string }) => {
  return (
    <EmptyState
      action={
        <Button asChild>
          <Link href={routes.login}>Go to sign in</Link>
        </Button>
      }
      description={description}
      icon={<TriangleAlert aria-hidden="true" className="size-5" />}
      title="Invite unavailable"
    />
  );
};

interface InvitePageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const currentUser = await getCurrentUser();

  if (currentUser) {
    return <InviteConflict currentEmail={currentUser.email ?? "your account"} />;
  }

  const inviteTokenHash = await hashToken(token);
  const adminClient = createAdminClient();
  const { data: invite, error } = await adminClient
    .from("invites")
    .select("id, email, app_role, accepted_at, revoked_at, expires_at")
    .eq("invite_token_hash", inviteTokenHash)
    .maybeSingle();

  if (error) {
    return <InviteErrorState description={INVALID_INVITE_MESSAGE} />;
  }

  const validatedInvite = invite as ValidatedInvite | null;

  if (!validatedInvite) {
    return <InviteErrorState description={INVALID_INVITE_MESSAGE} />;
  }

  if (validatedInvite.accepted_at !== null) {
    return <InviteErrorState description={USED_INVITE_MESSAGE} />;
  }

  if (validatedInvite.revoked_at !== null) {
    return <InviteErrorState description={REVOKED_INVITE_MESSAGE} />;
  }

  if (new Date(validatedInvite.expires_at) <= new Date()) {
    return <InviteErrorState description={EXPIRED_INVITE_MESSAGE} />;
  }

  return <InviteAcceptanceForm email={validatedInvite.email} token={token} />;
}
