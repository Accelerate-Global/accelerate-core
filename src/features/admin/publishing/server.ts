import "server-only";

import {
  getSelectedDatasetId,
  loadAdminDatasetInventory,
} from "@/features/admin/datasets/server";
import {
  listAdminAuthUsers,
  listAdminDatasetVersionEvents,
  listAdminProfiles,
  listAdminPublishRuns,
} from "@/features/admin/server";
import type {
  AdminDatasetRecord,
  AdminDatasetVersionEventRecord,
  AdminDatasetVersionRecord,
  AdminPublishingSelectedVersion,
  AdminPublishRunRecord,
} from "@/features/admin/shared";
import {
  buildDatasetVersionComparisonSummary,
  buildDatasetVersionLineageGraph,
} from "@/features/datasets/lineage-service";
import {
  normalizeDatasetVersion,
  normalizeDatasetVersionSource,
  normalizeJsonRecord,
} from "@/features/datasets/types";
import { requireCurrentUserAdmin } from "@/lib/auth/server";

export interface AdminPublishingPageData {
  datasets: AdminDatasetRecord[];
  publishRuns: AdminPublishRunRecord[];
  selectedDataset: AdminDatasetRecord | null;
  selectedDatasetId: string | null;
  selectedVersion: AdminPublishingSelectedVersion | null;
  selectedVersionId: string | null;
  versionEvents: AdminDatasetVersionEventRecord[];
  versions: AdminDatasetVersionRecord[];
}

const normalizeSearchParam = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }

  return value?.trim() ?? "";
};

const getSelectedVersionId = (
  searchParams: Record<string, string | string[] | undefined>,
  versions: AdminDatasetVersionRecord[],
  activeVersionId: string | null
): string | null => {
  const versionId = normalizeSearchParam(searchParams.versionId);

  if (versionId && versions.some((version) => version.id === versionId)) {
    return versionId;
  }

  if (
    activeVersionId &&
    versions.some((version) => version.id === activeVersionId)
  ) {
    return activeVersionId;
  }

  return versions[0]?.id ?? null;
};

const getPipelineContractNotes = (): string[] => {
  return [
    "Dataset-version lineage is sourced from dataset_version_sources.",
    "Row provenance can normalize ingestedFrom and optional upstreamRows when the pipeline emits them in dataset_rows.lineage.",
    "Field-level lineage remains deferred until the pipeline provides explicit field mappings.",
  ];
};

const mapEventMetadataSummary = (
  value: ReturnType<typeof normalizeJsonRecord>
): string[] => {
  const summary: string[] = [];

  if (value.publishedFirstTime === true) {
    summary.push("First publication");
  }

  if (typeof value.reason === "string" && value.reason.trim()) {
    summary.push(value.reason);
  }

  if (value.seeded === true) {
    summary.push("Seeded history");
  }

  return summary;
};

export const loadAdminPublishingPage = async (
  searchParams: Record<string, string | string[] | undefined>
): Promise<AdminPublishingPageData> => {
  await requireCurrentUserAdmin();
  const inventory = await loadAdminDatasetInventory();
  const [profiles, authUsers, versionEvents, publishRuns] = await Promise.all([
    listAdminProfiles(),
    listAdminAuthUsers(),
    listAdminDatasetVersionEvents(),
    listAdminPublishRuns(),
  ]);
  const profileById = new Map(
    profiles.map((profile) => [profile.user_id, profile] as const)
  );
  const rawVersionsById = new Map(
    inventory.rawVersions.map((version) => [version.id, version] as const)
  );
  const normalizedVersionsById = new Map(
    inventory.rawVersions.map((version) => {
      return [version.id, normalizeDatasetVersion(version)] as const;
    })
  );
  const selectedDatasetId = getSelectedDatasetId(
    searchParams,
    inventory.datasets
  );
  const selectedDataset = selectedDatasetId
    ? (inventory.datasetById.get(selectedDatasetId) ?? null)
    : null;
  const datasetVersions = selectedDataset
    ? (inventory.versionsByDatasetId.get(selectedDataset.id) ?? []).sort(
        (leftVersion, rightVersion) => {
          return rightVersion.version_number - leftVersion.version_number;
        }
      )
    : [];
  const selectedVersionId = selectedDataset
    ? getSelectedVersionId(
        searchParams,
        datasetVersions.map((version) => ({
          changeSummary: version.change_summary,
          comparisonToActive: null,
          createdAt: version.created_at,
          datasetId: version.dataset_id,
          id: version.id,
          isActive: version.id === selectedDataset.activeVersionId,
          isDerived:
            (inventory.versionSourcesByVersionId.get(version.id) ?? []).length >
            0,
          notes: version.notes,
          publishedAt: version.published_at,
          publishedByDisplayName: null,
          publishedByEmail: null,
          rowCount: version.row_count,
          sourceCount: (
            inventory.versionSourcesByVersionId.get(version.id) ?? []
          ).length,
          sourceRef: version.source_ref,
          sources: [],
          versionNumber: version.version_number,
        })),
        selectedDataset.activeVersionId
      )
    : null;
  const activeVersion = selectedDataset?.activeVersionId
    ? (normalizedVersionsById.get(selectedDataset.activeVersionId) ?? null)
    : null;
  const datasetReferences = inventory.datasets.map((dataset) => ({
    id: dataset.id,
    name: dataset.name,
    slug: dataset.slug,
  }));
  const versionReferences = inventory.rawVersions.map((version) => ({
    datasetId: version.dataset_id,
    id: version.id,
    versionNumber: version.version_number,
  }));

  const versions = selectedDataset
    ? datasetVersions.map((version) => {
        const normalizedVersion = normalizedVersionsById.get(version.id);

        if (!normalizedVersion) {
          throw new Error(
            "The selected dataset version could not be normalized."
          );
        }

        const sourceRecords =
          inventory.versionSourcesByVersionId.get(version.id) ?? [];
        const sources = sourceRecords
          .map((sourceRecord) => {
            const sourceVersion = rawVersionsById.get(
              sourceRecord.source_dataset_version_id
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
          .filter((value): value is NonNullable<typeof value> =>
            Boolean(value)
          );
        const publishedByProfile = version.published_by
          ? profileById.get(version.published_by)
          : undefined;
        const publishedByAuthUser = version.published_by
          ? authUsers.usersById.get(version.published_by)
          : undefined;
        const comparisonToActive =
          activeVersion && activeVersion.id !== normalizedVersion.id
            ? buildDatasetVersionComparisonSummary({
                baselineChangeSummary: activeVersion.changeSummary,
                baselineColumns: activeVersion.columnDefinitions.columns,
                baselineNotes: activeVersion.notes,
                baselineRowCount: activeVersion.rowCount,
                baselineSources: (
                  inventory.versionSourcesByVersionId.get(activeVersion.id) ??
                  []
                ).map((source) => normalizeDatasetVersionSource(source)),
                candidateChangeSummary: normalizedVersion.changeSummary,
                candidateColumns: normalizedVersion.columnDefinitions.columns,
                candidateNotes: normalizedVersion.notes,
                candidateRowCount: normalizedVersion.rowCount,
                candidateSources: sourceRecords.map((source) => {
                  return normalizeDatasetVersionSource(source);
                }),
                datasets: datasetReferences,
                versions: versionReferences,
              })
            : null;

        return {
          changeSummary: normalizedVersion.changeSummary,
          comparisonToActive,
          createdAt: normalizedVersion.createdAt,
          datasetId: normalizedVersion.datasetId,
          id: normalizedVersion.id,
          isActive: normalizedVersion.id === selectedDataset.activeVersionId,
          isDerived: sources.length > 0,
          notes: normalizedVersion.notes,
          publishedAt: normalizedVersion.publishedAt,
          publishedByDisplayName: publishedByProfile?.display_name ?? null,
          publishedByEmail: publishedByAuthUser?.email ?? null,
          rowCount: normalizedVersion.rowCount,
          sourceCount: sources.length,
          sourceRef: normalizedVersion.sourceRef,
          sources,
          versionNumber: normalizedVersion.versionNumber,
        } satisfies AdminDatasetVersionRecord;
      })
    : [];

  const selectedVersionRecord = selectedVersionId
    ? (versions.find((version) => version.id === selectedVersionId) ?? null)
    : null;
  const selectedVersion: AdminPublishingSelectedVersion | null =
    selectedVersionRecord
      ? {
          lineageGraph: buildDatasetVersionLineageGraph({
            datasets: datasetReferences,
            selectedVersionId: selectedVersionRecord.id,
            sources: inventory.rawVersionSources.map((source) => {
              return normalizeDatasetVersionSource(source);
            }),
            versions: versionReferences,
          }),
          pipelineContractNotes: getPipelineContractNotes(),
          version: selectedVersionRecord,
        }
      : null;
  const filteredVersionEvents = selectedDataset
    ? versionEvents
        .filter((event) => event.dataset_id === selectedDataset.id)
        .map((event) => {
          const actorProfile = event.actor_user_id
            ? profileById.get(event.actor_user_id)
            : undefined;
          const actorAuthUser = event.actor_user_id
            ? authUsers.usersById.get(event.actor_user_id)
            : undefined;
          const version = rawVersionsById.get(event.dataset_version_id);
          const previousVersion = event.previous_dataset_version_id
            ? (rawVersionsById.get(event.previous_dataset_version_id) ?? null)
            : null;

          return {
            actorDisplayName: actorProfile?.display_name ?? null,
            actorEmail: actorAuthUser?.email ?? null,
            createdAt: event.created_at,
            datasetId: event.dataset_id,
            eventType: event.event_type,
            id: event.id,
            metadataSummary: mapEventMetadataSummary(
              normalizeJsonRecord(event.metadata)
            ),
            previousVersionId: event.previous_dataset_version_id,
            previousVersionNumber: previousVersion?.version_number ?? null,
            versionId: event.dataset_version_id,
            versionNumber: version?.version_number ?? null,
          } satisfies AdminDatasetVersionEventRecord;
        })
    : [];
  const filteredPublishRuns = selectedDataset
    ? publishRuns
        .filter((run) => run.dataset_id === selectedDataset.id)
        .map((run) => {
          const actorProfile = run.requested_by
            ? profileById.get(run.requested_by)
            : undefined;
          const actorAuthUser = run.requested_by
            ? authUsers.usersById.get(run.requested_by)
            : undefined;
          const version = rawVersionsById.get(run.dataset_version_id);

          return {
            actionType: run.action_type,
            completedAt: run.completed_at,
            createdAt: run.created_at,
            datasetId: run.dataset_id,
            datasetName: selectedDataset.name,
            datasetVersionId: run.dataset_version_id,
            datasetVersionNumber: version?.version_number ?? null,
            errorMessage: run.error_message,
            id: run.id,
            requestedByDisplayName: actorProfile?.display_name ?? null,
            requestedByEmail: actorAuthUser?.email ?? null,
            requestedByUserId: run.requested_by,
            startedAt: run.started_at,
            status: run.status,
          } satisfies AdminPublishRunRecord;
        })
    : [];

  return {
    datasets: inventory.datasets,
    publishRuns: filteredPublishRuns,
    selectedDataset,
    selectedDatasetId,
    selectedVersion,
    selectedVersionId,
    versionEvents: filteredVersionEvents,
    versions,
  };
};
