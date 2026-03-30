"use client";

import { RefreshCw } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { regenerateInviteAction } from "@/features/admin/invites/actions";
import { createInitialAdminActionState } from "@/features/admin/shared";
import { CopyButton } from "@/features/admin/ui/copy-button";

interface RegenerateInviteFormProps {
  inviteId: string;
}

const initialState = createInitialAdminActionState<{
  inviteId: string;
  inviteLink: string;
}>();

export const RegenerateInviteForm = ({
  inviteId,
}: RegenerateInviteFormProps) => {
  const [state, formAction, isPending] = useActionState(
    regenerateInviteAction,
    initialState
  );

  return (
    <div className="space-y-2">
      <form action={formAction} className="flex justify-end">
        <input name="inviteId" type="hidden" value={inviteId} />
        <Button disabled={isPending} size="sm" type="submit" variant="outline">
          <RefreshCw aria-hidden="true" />
          {isPending ? "Regenerating..." : "Regenerate"}
        </Button>
      </form>
      {state.data?.inviteId === inviteId && state.data.inviteLink ? (
        <div className="flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800 text-xs">
          <p>Replacement invite created. Copy the new raw link now.</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="overflow-x-auto rounded-md bg-background px-2 py-1">
              {state.data.inviteLink}
            </code>
            <CopyButton value={state.data.inviteLink} />
          </div>
        </div>
      ) : null}
      {state.status === "error" && state.message ? (
        <p className="text-destructive text-xs">{state.message}</p>
      ) : null}
    </div>
  );
};
