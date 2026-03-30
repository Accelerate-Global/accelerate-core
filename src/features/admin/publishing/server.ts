import "server-only";

import {
  getSelectedDatasetId,
  loadAdminDatasetInventory,
} from "@/features/admin/datasets/server";
import type {
  AdminDatasetRecord,
  AdminDatasetVersionRecord,
} from "@/features/admin/shared";
import { requireCurrentUserAdmin } from "@/lib/auth/server";

export interface AdminPublishingPageData {
  datasets: AdminDatasetRecord[];
  selectedDataset: AdminDatasetRecord | null;
  selectedDatasetId: string | null;
  versions: AdminDatasetVersionRecord[];
}

export const loadAdminPublishingPage = async (
  searchParams: Record<string, string | string[] | undefined>
): Promise<AdminPublishingPageData> => {
  await requireCurrentUserAdmin();
  const inventory = await loadAdminDatasetInventory();
  const selectedDatasetId = getSelectedDatasetId(
    searchParams,
    inventory.datasets
  );
  const selectedDataset = selectedDatasetId
    ? (inventory.datasetById.get(selectedDatasetId) ?? null)
    : null;
  const versions = selectedDataset
    ? (inventory.versionsByDatasetId.get(selectedDataset.id) ?? [])
        .map((version) => {
          const sourceRecords =
            inventory.versionSourcesByVersionId.get(version.id) ?? [];
          const sources = sourceRecords
            .map((sourceRecord) => {
              const sourceVersion = inventory.rawVersions.find(
                (candidateVersion) =>
                  candidateVersion.id === sourceRecord.source_dataset_version_id
              );
              const sourceDataset = sourceVersion
                ? (inventory.datasetById.get(sourceVersion.dataset_id) ?? null)
                : null;

              if (!(sourceVersion && sourceDataset)) {
                return null;
              }

              return {
                datasetId: sourceDataset.id,
                datasetName: sourceDataset.name,
                datasetSlug: sourceDataset.slug,
                relationType: sourceRecord.relation_type,
                versionId: sourceVersion.id,
                versionNumber: sourceVersion.version_number,
              };
            })
            .filter((value) => value !== null);

          return {
            createdAt: version.created_at,
            datasetId: version.dataset_id,
            id: version.id,
            isDerived: sources.length > 0,
            isActive: version.id === selectedDataset.activeVersionId,
            rowCount: version.row_count,
            sourceRef: version.source_ref,
            sourceCount: sources.length,
            sources,
            versionNumber: version.version_number,
          } satisfies AdminDatasetVersionRecord;
        })
        .sort((leftVersion, rightVersion) => {
          return rightVersion.versionNumber - leftVersion.versionNumber;
        })
    : [];

  return {
    datasets: inventory.datasets,
    selectedDataset,
    selectedDatasetId,
    versions,
  };
};
