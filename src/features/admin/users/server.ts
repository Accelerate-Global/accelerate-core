import "server-only";

import {
  listAdminAuthUsers,
  listAdminProfiles,
  listAdminWorkspaceMemberships,
  listAdminWorkspaces,
} from "@/features/admin/server";

import { type AdminUserRecord, appRoleLabel } from "@/features/admin/shared";
import { requireCurrentUserAdmin } from "@/lib/auth/server";

export interface AdminUsersPageData {
  actingUserId: string;
  authMetadataAvailable: boolean;
  query: string;
  roleFilter: "admin" | "all" | "user";
  totalAdminCount: number;
  users: AdminUserRecord[];
}

const normalizeSearchParam = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }

  return value?.trim() ?? "";
};

const matchesQuery = (user: AdminUserRecord, query: string): boolean => {
  if (!query) {
    return true;
  }

  const normalizedQuery = query.toLowerCase();
  const haystacks = [
    user.displayName ?? "",
    user.email ?? "",
    appRoleLabel[user.appRole],
    ...user.memberships.map((membership) => membership.name),
  ];

  return haystacks.some((value) =>
    value.toLowerCase().includes(normalizedQuery)
  );
};

export const loadAdminUsersPage = async (
  searchParams: Record<string, string | string[] | undefined>
): Promise<AdminUsersPageData> => {
  const actingUser = await requireCurrentUserAdmin();

  const query = normalizeSearchParam(searchParams.q);
  const roleFilterValue = normalizeSearchParam(searchParams.role);
  const roleFilter =
    roleFilterValue === "admin" || roleFilterValue === "user"
      ? roleFilterValue
      : "all";

  const [profiles, memberships, workspaces, authUsers] = await Promise.all([
    listAdminProfiles(),
    listAdminWorkspaceMemberships(),
    listAdminWorkspaces(),
    listAdminAuthUsers(),
  ]);

  const workspaceById = new Map(
    workspaces.map((workspace) => [workspace.id, workspace] as const)
  );
  const membershipsByUserId = new Map<string, AdminUserRecord["memberships"]>();

  for (const membership of memberships) {
    const workspace = workspaceById.get(membership.workspace_id);

    if (!workspace) {
      continue;
    }

    const currentMemberships =
      membershipsByUserId.get(membership.user_id) ?? [];
    currentMemberships.push({
      id: workspace.id,
      name: workspace.name,
      role: membership.role,
      slug: workspace.slug,
    });
    membershipsByUserId.set(membership.user_id, currentMemberships);
  }

  const users = profiles
    .map((profile) => {
      const authUser = authUsers.usersById.get(profile.user_id);

      return {
        appRole: profile.app_role,
        authMetadataAvailable: Boolean(authUser),
        createdAt: profile.created_at,
        displayName: profile.display_name,
        email: authUser?.email ?? null,
        lastSignInAt: authUser?.last_sign_in_at ?? null,
        memberships: membershipsByUserId.get(profile.user_id) ?? [],
        updatedAt: profile.updated_at,
        userId: profile.user_id,
      } satisfies AdminUserRecord;
    })
    .filter((user) => {
      if (roleFilter === "all") {
        return true;
      }

      return user.appRole === roleFilter;
    })
    .filter((user) => matchesQuery(user, query))
    .sort((leftUser, rightUser) => {
      const leftLabel =
        leftUser.displayName ?? leftUser.email ?? leftUser.userId;
      const rightLabel =
        rightUser.displayName ?? rightUser.email ?? rightUser.userId;

      return leftLabel.localeCompare(rightLabel);
    });
  const totalAdminCount = profiles.filter((profile) => {
    return profile.app_role === "admin";
  }).length;

  return {
    actingUserId: actingUser.id,
    authMetadataAvailable: authUsers.isAvailable,
    query,
    roleFilter,
    totalAdminCount,
    users,
  };
};
