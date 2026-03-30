import "server-only";

import {
  listAdminAuthUsers,
  listAdminInvites,
  listAdminProfiles,
} from "@/features/admin/server";

import {
  type AdminInviteRecord,
  getEffectiveInviteStatus,
  type InviteStatus,
} from "@/features/admin/shared";
import { requireCurrentUserAdmin } from "@/lib/auth/server";

export interface AdminInvitesPageData {
  authMetadataAvailable: boolean;
  invites: AdminInviteRecord[];
  query: string;
  statusFilter: "accepted" | "all" | "expired" | "pending" | "revoked";
}

const normalizeSearchParam = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }

  return value?.trim() ?? "";
};

export const loadAdminInvitesPage = async (
  searchParams: Record<string, string | string[] | undefined>
): Promise<AdminInvitesPageData> => {
  await requireCurrentUserAdmin();

  const query = normalizeSearchParam(searchParams.q).toLowerCase();
  const statusFilterValue = normalizeSearchParam(searchParams.status);
  const statusFilter =
    statusFilterValue === "accepted" ||
    statusFilterValue === "expired" ||
    statusFilterValue === "pending" ||
    statusFilterValue === "revoked"
      ? statusFilterValue
      : "all";

  const [invites, profiles, authUsers] = await Promise.all([
    listAdminInvites(),
    listAdminProfiles(),
    listAdminAuthUsers(),
  ]);

  const profileById = new Map(
    profiles.map((profile) => [profile.user_id, profile] as const)
  );

  const pageInvites = invites
    .map((invite) => {
      const createdByProfile = invite.created_by
        ? profileById.get(invite.created_by)
        : undefined;
      const createdByAuthUser = invite.created_by
        ? authUsers.usersById.get(invite.created_by)
        : undefined;

      return {
        acceptedAt: invite.accepted_at,
        createdAt: invite.created_at,
        createdByDisplayName: createdByProfile?.display_name ?? null,
        createdByEmail: createdByAuthUser?.email ?? null,
        createdByUserId: invite.created_by,
        email: invite.email,
        expiresAt: invite.expires_at,
        id: invite.id,
        inviteLink: null,
        status: invite.status,
      } satisfies AdminInviteRecord;
    })
    .filter((invite) => {
      const effectiveStatus = getEffectiveInviteStatus(
        invite.status,
        invite.expiresAt
      );

      if (statusFilter !== "all" && effectiveStatus !== statusFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystacks = [
        invite.email,
        invite.createdByDisplayName ?? "",
        invite.createdByEmail ?? "",
      ];

      return haystacks.some((value) => value.toLowerCase().includes(query));
    });

  return {
    authMetadataAvailable: authUsers.isAvailable,
    invites: pageInvites,
    query,
    statusFilter,
  };
};

export const countInvitesByEffectiveStatus = (
  invites: AdminInviteRecord[],
  status: InviteStatus
): number => {
  return invites.filter((invite) => {
    return getEffectiveInviteStatus(invite.status, invite.expiresAt) === status;
  }).length;
};
