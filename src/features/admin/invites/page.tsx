import { MailPlus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { revokeInviteAction } from "@/features/admin/invites/actions";
import { CreateInviteForm } from "@/features/admin/invites/create-invite-form";
import { RegenerateInviteForm } from "@/features/admin/invites/regenerate-invite-form";
import type { AdminInvitesPageData } from "@/features/admin/invites/server";
import {
  formatAdminDateTime,
  getEffectiveInviteStatus,
  inviteStatusLabel,
  isPendingInviteActionable,
} from "@/features/admin/shared";
import { AdminModuleShell } from "@/features/admin/ui/admin-module-shell";
import { ConfirmSubmitButton } from "@/features/admin/ui/confirm-submit-button";
import { routes } from "@/lib/routes";

const inviteStatusBadgeClassName = {
  accepted: "border-emerald-200 bg-emerald-50 text-emerald-700",
  expired: "border-zinc-200 bg-zinc-100 text-zinc-700",
  pending: "border-blue-200 bg-blue-50 text-blue-700",
  revoked: "border-rose-200 bg-rose-50 text-rose-700",
} as const;

export const AdminInvitesPageView = ({
  authMetadataAvailable,
  invites,
  query,
  statusFilter,
}: AdminInvitesPageData) => {
  return (
    <AdminModuleShell
      description="Create app-owned invite links, inspect invite history, and revoke or replace pending links without layering in a custom email system."
      route={routes.adminInvites}
      title="Invites"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,21rem)_minmax(0,1fr)]">
        <CreateInviteForm />
        <Card>
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <CardTitle>Invite history</CardTitle>
              <CardDescription>
                Regeneration revokes the old row and creates a fresh invite for
                clean audit history.
              </CardDescription>
            </div>
            <form className="grid gap-3 sm:grid-cols-[minmax(0,18rem)_10rem_auto]">
              <label className="grid gap-2" htmlFor="admin-invites-search">
                <span className="font-medium text-sm">Search</span>
                <Input
                  defaultValue={query}
                  id="admin-invites-search"
                  name="q"
                  placeholder="Invite email or creator"
                />
              </label>
              <label className="grid gap-2" htmlFor="admin-invites-status">
                <span className="font-medium text-sm">Status</span>
                <Select
                  defaultValue={statusFilter}
                  id="admin-invites-status"
                  name="status"
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="expired">Expired</option>
                  <option value="revoked">Revoked</option>
                </Select>
              </label>
              <div className="flex items-end">
                <Button type="submit" variant="outline">
                  <Search aria-hidden="true" />
                  Apply
                </Button>
              </div>
            </form>
          </CardHeader>
          <CardContent className="space-y-4">
            {authMetadataAvailable ? null : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-sm">
                Creator email enrichment is currently unavailable. Invite
                history is still rendering from app tables.
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invite</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-muted-foreground" colSpan={6}>
                      No invites match the current filters.
                    </TableCell>
                  </TableRow>
                ) : null}
                {invites.map((invite) => {
                  const effectiveStatus = getEffectiveInviteStatus(
                    invite.status,
                    invite.expiresAt
                  );

                  return (
                    <TableRow key={invite.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{invite.email}</p>
                          <p className="text-muted-foreground text-xs">
                            {invite.id}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            inviteStatusBadgeClassName[effectiveStatus]
                          }
                        >
                          {inviteStatusLabel[effectiveStatus]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatAdminDateTime(invite.createdAt)}
                      </TableCell>
                      <TableCell>
                        {formatAdminDateTime(invite.expiresAt)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">
                            {invite.createdByDisplayName ?? "Unknown creator"}
                          </p>
                          <p className="text-muted-foreground text-sm">
                            {invite.createdByEmail ?? "Email unavailable"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="space-y-2 text-right">
                        {invite.status === "accepted" ? (
                          <p className="text-muted-foreground text-sm">
                            Accepted invites are immutable.
                          </p>
                        ) : (
                          <>
                            <RegenerateInviteForm inviteId={invite.id} />
                            {isPendingInviteActionable(invite) ? (
                              <form
                                action={revokeInviteAction}
                                className="flex justify-end"
                              >
                                <input
                                  name="inviteId"
                                  type="hidden"
                                  value={invite.id}
                                />
                                <ConfirmSubmitButton
                                  confirmLabel="Revoke invite"
                                  idleLabel="Revoke"
                                  variant="destructive"
                                />
                              </form>
                            ) : null}
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MailPlus
              aria-hidden="true"
              className="size-4 text-muted-foreground"
            />
            Delivery model
          </CardTitle>
          <CardDescription>
            This phase stops at invite creation and management. Operators copy
            links for manual delivery, and the public redemption flow remains
            part of the auth/access phase.
          </CardDescription>
        </CardHeader>
      </Card>
    </AdminModuleShell>
  );
};
