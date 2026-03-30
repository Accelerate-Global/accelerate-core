import "server-only";

import { loadAdminDatasetInventory } from "@/features/admin/datasets/server";
import { listAdminInvites, listAdminProfiles } from "@/features/admin/server";
import {
  type AdminDashboardSummary,
  getEffectiveInviteStatus,
} from "@/features/admin/shared";
import { requireCurrentUserAdmin } from "@/lib/auth/server";

export const loadAdminDashboardPage =
  async (): Promise<AdminDashboardSummary> => {
    await requireCurrentUserAdmin();
    const [profiles, invites, datasetInventory] = await Promise.all([
      listAdminProfiles(),
      listAdminInvites(),
      loadAdminDatasetInventory(),
    ]);

    const defaultGlobalDataset =
      datasetInventory.datasets.find((dataset) => dataset.isDefaultGlobal) ??
      null;

    return {
      acceptedInviteCount: invites.filter((invite) => {
        return (
          getEffectiveInviteStatus(invite.status, invite.expires_at) ===
          "accepted"
        );
      }).length,
      datasetCount: datasetInventory.datasets.length,
      defaultGlobalActiveVersionNumber:
        defaultGlobalDataset?.activeVersionNumber ?? null,
      defaultGlobalDatasetName: defaultGlobalDataset?.name ?? null,
      hasDefaultGlobalDataset: Boolean(defaultGlobalDataset),
      pendingInviteCount: invites.filter((invite) => {
        return (
          getEffectiveInviteStatus(invite.status, invite.expires_at) ===
          "pending"
        );
      }).length,
      privateDatasetCount: datasetInventory.datasets.filter((dataset) => {
        return dataset.visibility === "private";
      }).length,
      sharedDatasetCount: datasetInventory.datasets.filter((dataset) => {
        return dataset.visibility === "shared";
      }).length,
      totalUserCount: profiles.length,
      workspaceDatasetCount: datasetInventory.datasets.filter((dataset) => {
        return dataset.visibility === "workspace";
      }).length,
    };
  };
