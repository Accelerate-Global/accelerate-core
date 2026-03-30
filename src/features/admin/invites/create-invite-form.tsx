"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createInviteAction } from "@/features/admin/invites/actions";
import {
  createInitialAdminActionState,
  defaultInviteDurationDays,
} from "@/features/admin/shared";
import { CopyButton } from "@/features/admin/ui/copy-button";

const initialState = createInitialAdminActionState<{
  inviteId: string;
  inviteLink: string;
}>();

export const CreateInviteForm = () => {
  const [state, formAction, isPending] = useActionState(
    createInviteAction,
    initialState
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create invite</CardTitle>
        <CardDescription>
          Invite links are generated for manual delivery and can only be copied
          once. New invites expire after {defaultInviteDurationDays} days.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={formAction} className="flex flex-col gap-3 sm:flex-row">
          <Input name="email" placeholder="person@example.com" type="email" />
          <Button disabled={isPending} type="submit">
            {isPending ? "Creating..." : "Create invite"}
          </Button>
        </form>
        {state.message ? (
          <div
            className={
              state.status === "error"
                ? "rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive text-sm"
                : "rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 text-sm"
            }
          >
            <p>{state.message}</p>
            {state.data?.inviteLink ? (
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                <code className="overflow-x-auto rounded-md bg-background px-3 py-2 text-xs">
                  {state.data.inviteLink}
                </code>
                <CopyButton value={state.data.inviteLink} />
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};
