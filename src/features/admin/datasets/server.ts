import "server-only";

import {
  listAdminDatasetAccess,
  listAdminDatasets,
  listAdminDatasetVersionSources,
  listAdminDatasetVersions,
  listAdminWorkspaces,
} from "@/features/admin/server";
import type { AdminDatasetRecord } from "@/features/admin/shared";
import { requireCurrentUserAdmin } from "@/lib/auth/server";
import type { Tables } from "@/lib/supabase/database.types";

export interface AdminDatasetInventory {
  accessByDatasetId: Map<string, Tables<"dataset_access">[]>;
  datasetById: Map<string, AdminDatasetRecord>;
  datasets: AdminDatasetRecord[];
  rawAccess: Tables<"dataset_access">[];
  rawVersionSources: Tables<"dataset_version_sources">[];
  rawVersions: Tables<"dataset_versions">[];
  versionSourcesByVersionId: Map<string, Tables<"dataset_version_sources">[]>;
  versionsByDatasetId: Map<string, Tables<"dataset_versions">[]>;
  workspaceById: Map<string, Tables<"workspaces">>;
}

export interface AdminDatasetsPageData {
  datasets: AdminDatasetRecord[];
  query: string;
  visibilityFilter: "all" | AdminDatasetRecord["visibility"];
}

const normalizeSearchParam = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }

  return value?.trim() ?? "";
};

export const loadAdminDatasetInventory =
  async (): Promise<AdminDatasetInventory> => {
    await requireCurrentUserAdmin();

    const [datasets, versions, versionSources, access, workspaces] =
      await Promise.all([
        listAdminDatasets(),
        listAdminDatasetVersions(),
        listAdminDatasetVersionSources(),
        listAdminDatasetAccess(),
        listAdminWorkspaces(),
      ]);

    const workspaceById = new Map(
      workspaces.map((workspace) => [workspace.id, workspace] as const)
    );
    const versionsByDatasetId = new Map<string, Tables<"dataset_versions">[]>();
    const accessByDatasetId = new Map<string, Tables<"dataset_access">[]>();
    const versionSourcesByVersionId = new Map<
      string,
      Tables<"dataset_version_sources">[]
    >();

    for (const version of versions) {
      const currentVersions = versionsByDatasetId.get(version.dataset_id) ?? [];
      currentVersions.push(version);
      versionsByDatasetId.set(version.dataset_id, currentVersions);
    }

    for (const accessRecord of access) {
      const currentAccess =
        accessByDatasetId.get(accessRecord.dataset_id) ?? [];
      currentAccess.push(accessRecord);
      accessByDatasetId.set(accessRecord.dataset_id, currentAccess);
    }

    for (const versionSource of versionSources) {
      const currentSources =
        versionSourcesByVersionId.get(versionSource.dataset_version_id) ?? [];
      currentSources.push(versionSource);
      versionSourcesByVersionId.set(
        versionSource.dataset_version_id,
        currentSources
      );
    }

    const adminDatasets = datasets
      .map((dataset) => {
        const datasetVersions = versionsByDatasetId.get(dataset.id) ?? [];
        const activeVersion = dataset.active_version_id
          ? datasetVersions.find(
              (version) => version.id === dataset.active_version_id
            )
          : undefined;
        const grants = accessByDatasetId.get(dataset.id) ?? [];
        const ownerWorkspace = dataset.owner_workspace_id
          ? workspaceById.get(dataset.owner_workspace_id)
          : undefined;
        const sharedWorkspaceCount = grants.filter((grant) =>
          Boolean(grant.workspace_id)
        ).length;
        const activeVersionSources = dataset.active_version_id
          ? (versionSourcesByVersionId.get(dataset.active_version_id) ?? [])
          : [];

        return {
          activeVersionId: dataset.active_version_id,
          activeVersionIsDerived: activeVersionSources.length > 0,
          activeVersionNumber: activeVersion?.version_number ?? null,
          activeVersionSourceCount: activeVersionSources.length,
          createdAt: dataset.created_at,
          description: dataset.description,
          directUserGrantCount: grants.filter((grant) => Boolean(grant.user_id))
            .length,
          id: dataset.id,
          isDefaultGlobal: dataset.is_default_global,
          name: dataset.name,
          ownerWorkspaceId: dataset.owner_workspace_id,
          ownerWorkspaceName: ownerWorkspace?.name ?? null,
          sharedWorkspaceCount,
          slug: dataset.slug,
          updatedAt: dataset.updated_at,
          versionCount: datasetVersions.length,
          visibility: dataset.visibility,
          workspaceGrantCount: sharedWorkspaceCount,
        } satisfies AdminDatasetRecord;
      })
      .sort((leftDataset, rightDataset) => {
        return leftDataset.name.localeCompare(rightDataset.name);
      });

    return {
      accessByDatasetId,
      datasetById: new Map(
        adminDatasets.map((dataset) => [dataset.id, dataset] as const)
      ),
      datasets: adminDatasets,
      rawAccess: access,
      rawVersionSources: versionSources,
      rawVersions: versions,
      versionsByDatasetId,
      versionSourcesByVersionId,
      workspaceById,
    };
  };

export const loadAdminDatasetsPage = async (
  searchParams: Record<string, string | string[] | undefined>
): Promise<AdminDatasetsPageData> => {
  await requireCurrentUserAdmin();
  const inventory = await loadAdminDatasetInventory();
  const query = normalizeSearchParam(searchParams.q).toLowerCase();
  const visibilityFilterValue = normalizeSearchParam(searchParams.visibility);
  const visibilityFilter =
    visibilityFilterValue === "global" ||
    visibilityFilterValue === "private" ||
    visibilityFilterValue === "shared" ||
    visibilityFilterValue === "workspace"
      ? visibilityFilterValue
      : "all";

  const datasets = inventory.datasets.filter((dataset) => {
    if (visibilityFilter !== "all" && dataset.visibility !== visibilityFilter) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystacks = [
      dataset.name,
      dataset.slug,
      dataset.ownerWorkspaceName ?? "",
      dataset.visibility,
    ];

    return haystacks.some((value) => value.toLowerCase().includes(query));
  });

  return {
    datasets,
    query,
    visibilityFilter,
  };
};

export const getSelectedDatasetId = (
  searchParams: Record<string, string | string[] | undefined>,
  datasets: AdminDatasetRecord[]
): string | null => {
  const value = normalizeSearchParam(searchParams.datasetId);

  if (!value) {
    return datasets[0]?.id ?? null;
  }

  return datasets.some((dataset) => dataset.id === value)
    ? value
    : (datasets[0]?.id ?? null);
};
