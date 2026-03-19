import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { ErrorState } from "@/components/feedback/error-state";
import { requireAdmin } from "@/lib/auth";
import type { Invite } from "@/lib/invite/types";
import { createClient } from "@/lib/supabase/server";

import { InviteForm } from "./invite-form";
import { InviteList } from "./invite-list";

export default async function AdminInvitesPage() {
  if (!(await requireAdmin())) {
    return <AccessDeniedState />;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invites")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return <ErrorState description="We couldn’t load invites right now." />;
  }

  const invites = (data ?? []) as Invite[];

  return (
    <div className="space-y-8">
      <InviteForm />
      <section className="space-y-4">
        <h3 className="font-semibold text-lg tracking-tight">Invites</h3>
        <InviteList invites={invites} />
      </section>
    </div>
  );
}
