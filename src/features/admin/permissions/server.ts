import "server-only";

import {
  getSelectedDatasetId,
  loadAdminDatasetInventory,
} from "@/features/admin/datasets/server";
import { listAdminAuthUsers, listAdminProfiles } from "@/features/admin/server";
import {
  type AdminDatasetAccessDetails,
  type AdminDatasetRecord,
  type AdminDatasetUserGrant,
  type AdminDatasetWorkspaceGrant,
  getDatasetAccessRuleCopy,
} from "@/features/admin/shared";
import { requireCurrentUserAdmin } from "@/lib/auth/server";

export interface AdminPermissionOption {
  description: string | null;
  id: string;
  label: string;
}

export interface AdminPermissionsPageData {
  authMetadataAvailable: boolean;
  datasets: AdminDatasetRecord[];
  grantableUsers: AdminPermissionOption[];
  grantableWorkspaces: AdminPermissionOption[];
  selectedDatasetId: string | null;
  selectedDetails: AdminDatasetAccessDetails | null;
}

export const loadAdminPermissionsPage = async (
  searchParams: Record<string, string | string[] | undefined>
): Promise<AdminPermissionsPageData> => {
  await requireCurrentUserAdmin();
  const inventory = await loadAdminDatasetInventory();
  const [profiles, authUsers] = await Promise.all([
    listAdminProfiles(),
    listAdminAuthUsers(),
  ]);

  const profileById = new Map(
    profiles.map((profile) => [profile.user_id, profile] as const)
  );
  const selectedDatasetId = getSelectedDatasetId(
    searchParams,
    inventory.datasets
  );
  const selectedDataset = selectedDatasetId
    ? (inventory.datasetById.get(selectedDatasetId) ?? null)
    : null;
  const selectedAccessRecords = selectedDataset
    ? (inventory.accessByDatasetId.get(selectedDataset.id) ?? [])
    : [];

  const userGrants: AdminDatasetUserGrant[] = selectedAccessRecords
    .filter((accessRecord) => Boolean(accessRecord.user_id))
    .map((accessRecord) => {
      const targetProfile = accessRecord.user_id
        ? profileById.get(accessRecord.user_id)
        : undefined;
      const targetAuthUser = accessRecord.user_id
        ? authUsers.usersById.get(accessRecord.user_id)
        : undefined;
      const grantedByProfile = accessRecord.granted_by
        ? profileById.get(accessRecord.granted_by)
        : undefined;
      const grantedByAuthUser = accessRecord.granted_by
        ? authUsers.usersById.get(accessRecord.granted_by)
        : undefined;

      return {
        createdAt: accessRecord.created_at,
        grantedByDisplayName: grantedByProfile?.display_name ?? null,
        grantedByEmail: grantedByAuthUser?.email ?? null,
        id: accessRecord.id,
        userDisplayName: targetProfile?.display_name ?? null,
        userEmail: targetAuthUser?.email ?? null,
        userId: accessRecord.user_id ?? "",
      };
    })
    .sort((leftGrant, rightGrant) => {
      const leftLabel =
        leftGrant.userDisplayName ?? leftGrant.userEmail ?? leftGrant.userId;
      const rightLabel =
        rightGrant.userDisplayName ?? rightGrant.userEmail ?? rightGrant.userId;

      return leftLabel.localeCompare(rightLabel);
    });

  const explicitWorkspaceGrants: AdminDatasetWorkspaceGrant[] =
    selectedAccessRecords
      .filter((accessRecord) => Boolean(accessRecord.workspace_id))
      .map((accessRecord) => {
        const workspace = accessRecord.workspace_id
          ? inventory.workspaceById.get(accessRecord.workspace_id)
          : undefined;
        const grantedByProfile = accessRecord.granted_by
          ? profileById.get(accessRecord.granted_by)
          : undefined;
        const grantedByAuthUser = accessRecord.granted_by
          ? authUsers.usersById.get(accessRecord.granted_by)
          : undefined;

        return {
          createdAt: accessRecord.created_at,
          grantedByDisplayName: grantedByProfile?.display_name ?? null,
          grantedByEmail: grantedByAuthUser?.email ?? null,
          id: accessRecord.id,
          isImplicit: false,
          workspaceId: workspace?.id ?? "",
          workspaceName: workspace?.name ?? "Unknown workspace",
          workspaceSlug: workspace?.slug ?? "",
        };
      })
      .sort((leftGrant, rightGrant) => {
        return leftGrant.workspaceName.localeCompare(rightGrant.workspaceName);
      });

  const implicitOwnerWorkspaceGrant =
    selectedDataset?.ownerWorkspaceId &&
    (selectedDataset.visibility === "shared" ||
      selectedDataset.visibility === "workspace")
      ? (() => {
          const ownerWorkspace = inventory.workspaceById.get(
            selectedDataset.ownerWorkspaceId
          );

          if (!ownerWorkspace) {
            return null;
          }

          return {
            createdAt: selectedDataset.createdAt,
            grantedByDisplayName: null,
            grantedByEmail: null,
            id: `implicit:${ownerWorkspace.id}`,
            isImplicit: true,
            workspaceId: ownerWorkspace.id,
            workspaceName: ownerWorkspace.name,
            workspaceSlug: ownerWorkspace.slug,
          } satisfies AdminDatasetWorkspaceGrant;
        })()
      : null;

  const workspaceGrants = [
    ...(implicitOwnerWorkspaceGrant ? [implicitOwnerWorkspaceGrant] : []),
    ...explicitWorkspaceGrants,
  ];

  const grantedUserIds = new Set(userGrants.map((grant) => grant.userId));
  const grantedWorkspaceIds = new Set(
    workspaceGrants.map((grant) => grant.workspaceId)
  );

  const grantableUsers = profiles
    .filter((profile) => !grantedUserIds.has(profile.user_id))
    .map((profile) => {
      const authUser = authUsers.usersById.get(profile.user_id);

      return {
        description: authUser?.email ?? profile.user_id,
        id: profile.user_id,
        label:
          profile.display_name ??
          authUser?.email ??
          `User ${profile.user_id.slice(0, 8)}`,
      } satisfies AdminPermissionOption;
    })
    .sort((leftOption, rightOption) => {
      return leftOption.label.localeCompare(rightOption.label);
    });

  const grantableWorkspaces = Array.from(inventory.workspaceById.values())
    .filter((workspace) => !grantedWorkspaceIds.has(workspace.id))
    .filter((workspace) => workspace.id !== selectedDataset?.ownerWorkspaceId)
    .map((workspace) => {
      return {
        description: workspace.slug,
        id: workspace.id,
        label: workspace.name,
      } satisfies AdminPermissionOption;
    })
    .sort((leftOption, rightOption) => {
      return leftOption.label.localeCompare(rightOption.label);
    });

  return {
    authMetadataAvailable: authUsers.isAvailable,
    datasets: inventory.datasets,
    grantableUsers,
    grantableWorkspaces,
    selectedDatasetId,
    selectedDetails: selectedDataset
      ? {
          dataset: selectedDataset,
          groundedAccessRule: getDatasetAccessRuleCopy(
            selectedDataset.visibility
          ),
          userGrants,
          workspaceGrants,
        }
      : null,
  };
};
