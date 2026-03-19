import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import type { Invite, InviteStatus } from "@/lib/invite/types";
import { deriveInviteStatus } from "@/lib/invite/types";

interface InviteListProps {
  invites: Invite[];
}

const inviteDateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

const getStatusClassName = (status: InviteStatus): string => {
  switch (status) {
    case "Pending": {
      return "border-yellow-200 bg-yellow-50 text-yellow-800";
    }
    case "Accepted": {
      return "border-green-200 bg-green-50 text-green-800";
    }
    case "Expired": {
      return "border-zinc-200 bg-zinc-100 text-zinc-500";
    }
    case "Revoked": {
      return "border-red-200 bg-red-50 text-red-700";
    }
  }
};

const formatRoleLabel = (role: Invite["app_role"]): string => {
  return `${role.charAt(0).toUpperCase()}${role.slice(1)}`;
};

export const InviteList = ({ invites }: InviteListProps) => {
  if (invites.length === 0) {
    return (
      <EmptyState
        className="max-w-none"
        description="Create an invite to grant a teammate access to the workspace."
        title="No invites yet."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-muted/40">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
              Email
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
              Role
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
              Status
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">
              Expires
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-white">
          {invites.map((invite) => {
            const status = deriveInviteStatus(invite);

            return (
              <tr className="align-middle" key={invite.id}>
                <td className="px-4 py-4 text-foreground text-sm">
                  {invite.email}
                </td>
                <td className="px-4 py-4 text-foreground text-sm">
                  {formatRoleLabel(invite.app_role)}
                </td>
                <td className="px-4 py-4 text-sm">
                  <Badge className={getStatusClassName(status)} variant="outline">
                    {status}
                  </Badge>
                </td>
                <td className="px-4 py-4 text-muted-foreground text-sm">
                  {inviteDateFormatter.format(new Date(invite.expires_at))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
