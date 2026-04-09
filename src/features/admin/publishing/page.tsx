import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  activateDatasetVersionAction,
  updateDatasetVersionNotesAction,
} from "@/features/admin/datasets/actions";
import type { AdminPublishingPageData } from "@/features/admin/publishing/server";
import type {
  AdminDatasetVersionEventRecord,
  AdminDatasetVersionRecord,
  AdminPublishRunRecord,
  OperationRunStatus,
} from "@/features/admin/shared";
import {
  formatAdminDateTime,
  operationRunStatusLabel,
  visibilityLabel,
} from "@/features/admin/shared";
import { AdminModuleShell } from "@/features/admin/ui/admin-module-shell";
import { ConfirmSubmitButton } from "@/features/admin/ui/confirm-submit-button";
import { routes } from "@/lib/routes";

const visibilityBadgeClassName = {
  global: "border-emerald-200 bg-emerald-50 text-emerald-700",
  private: "border-zinc-200 bg-zinc-100 text-zinc-700",
  shared: "border-blue-200 bg-blue-50 text-blue-700",
  workspace: "border-orange-200 bg-orange-50 text-orange-700",
} as const;

const operationStatusBadgeClassName: Record<OperationRunStatus, string> = {
  failed: "border-red-200 bg-red-50 text-red-700",
  queued: "border-zinc-200 bg-zinc-100 text-zinc-700",
  running: "border-blue-200 bg-blue-50 text-blue-700",
  succeeded: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const formatRowCountDelta = (value: number): string => {
  if (value === 0) {
    return "No row count change";
  }

  return `${value > 0 ? "+" : ""}${value.toLocaleString()} row${
    Math.abs(value) === 1 ? "" : "s"
  }`;
};

const formatEventTypeLabel = (eventType: string): string => {
  return eventType === "published" ? "Published" : "Activated";
};

const formatPublishActionTypeLabel = (actionType: string): string => {
  return actionType === "activate_dataset_version"
    ? "Activate dataset version"
    : actionType;
};

const PublishRunStatusBadge = ({ status }: { status: OperationRunStatus }) => {
  return (
    <Badge className={operationStatusBadgeClassName[status]}>
      {operationRunStatusLabel[status]}
    </Badge>
  );
};

const buildPublishingHref = (datasetId: string, versionId?: string): string => {
  const params = new URLSearchParams({
    datasetId,
  });

  if (versionId) {
    params.set("versionId", versionId);
  }

  return `${routes.adminPublishing}?${params.toString()}`;
};

const VersionComparisonSummary = ({
  version,
}: {
  version: AdminDatasetVersionRecord;
}) => {
  if (!version.comparisonToActive) {
    return (
      <p className="text-muted-foreground text-xs">Current active baseline.</p>
    );
  }

  const summary = version.comparisonToActive;

  return (
    <div className="space-y-1 text-xs">
      <p className="text-muted-foreground">
        {formatRowCountDelta(summary.rowCountDelta)}
      </p>
      <p>
        Columns: +{summary.addedColumns.length} / -
        {summary.removedColumns.length} / type changes{" "}
        {summary.typeChanges.length}
      </p>
      <p>
        Lineage: +{summary.addedLineageSources.length} / -
        {summary.removedLineageSources.length}
      </p>
      <p className="text-muted-foreground">
        Notes changed: {summary.notesChanged ? "Yes" : "No"} · Change summary
        changed: {summary.changeSummaryChanged ? "Yes" : "No"}
      </p>
      {summary.addedColumns.length > 0 ? (
        <p className="text-muted-foreground">
          Added columns: {summary.addedColumns.join(", ")}
        </p>
      ) : null}
      {summary.removedColumns.length > 0 ? (
        <p className="text-muted-foreground">
          Removed columns: {summary.removedColumns.join(", ")}
        </p>
      ) : null}
      {summary.typeChanges.length > 0 ? (
        <p className="text-muted-foreground">
          Type changes:{" "}
          {summary.typeChanges
            .map((change) => {
              return `${change.fieldKey} (${change.fromDataType} → ${change.toDataType})`;
            })
            .join(", ")}
        </p>
      ) : null}
      {summary.addedLineageSources.length > 0 ? (
        <p className="text-muted-foreground">
          Added sources: {summary.addedLineageSources.join(", ")}
        </p>
      ) : null}
      {summary.removedLineageSources.length > 0 ? (
        <p className="text-muted-foreground">
          Removed sources: {summary.removedLineageSources.join(", ")}
        </p>
      ) : null}
    </div>
  );
};

const VersionEventHistoryTable = ({
  events,
}: {
  events: AdminDatasetVersionEventRecord[];
}) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>Event</TableHead>
          <TableHead>Version</TableHead>
          <TableHead>Previous</TableHead>
          <TableHead>Actor</TableHead>
          <TableHead>Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.length === 0 ? (
          <TableRow>
            <TableCell className="text-muted-foreground" colSpan={6}>
              No activation or publish history is recorded for this dataset yet.
            </TableCell>
          </TableRow>
        ) : null}
        {events.map((event) => (
          <TableRow key={event.id}>
            <TableCell>{formatAdminDateTime(event.createdAt)}</TableCell>
            <TableCell>{formatEventTypeLabel(event.eventType)}</TableCell>
            <TableCell>v{event.versionNumber ?? "?"}</TableCell>
            <TableCell>
              {event.previousVersionNumber
                ? `v${event.previousVersionNumber}`
                : "None"}
            </TableCell>
            <TableCell>
              <div className="space-y-1">
                <p>{event.actorDisplayName ?? "Unknown operator"}</p>
                <p className="text-muted-foreground text-xs">
                  {event.actorEmail ?? "Email unavailable"}
                </p>
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {event.metadataSummary.length > 0
                ? event.metadataSummary.join(" · ")
                : "No extra metadata"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const PublishingOperationsTable = ({
  publishRuns,
}: {
  publishRuns: AdminPublishRunRecord[];
}) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Version</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Operator</TableHead>
          <TableHead>Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {publishRuns.length === 0 ? (
          <TableRow>
            <TableCell className="text-muted-foreground" colSpan={6}>
              No publishing operation wrappers have been recorded for this
              dataset yet.
            </TableCell>
          </TableRow>
        ) : null}
        {publishRuns.map((run) => (
          <TableRow key={run.id}>
            <TableCell>{formatAdminDateTime(run.createdAt)}</TableCell>
            <TableCell>
              {formatPublishActionTypeLabel(run.actionType)}
            </TableCell>
            <TableCell>v{run.datasetVersionNumber ?? "?"}</TableCell>
            <TableCell>
              <PublishRunStatusBadge status={run.status} />
            </TableCell>
            <TableCell>
              <div className="space-y-1">
                <p>{run.requestedByDisplayName ?? "Unknown operator"}</p>
                <p className="text-muted-foreground text-xs">
                  {run.requestedByEmail ?? "Email unavailable"}
                </p>
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {run.errorMessage
                ? run.errorMessage
                : "Operational wrapper only. Domain publish history remains in dataset version events."}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const AdminPublishingVersionRow = ({
  datasetId,
  selectedVersionId,
  version,
}: {
  datasetId: string;
  selectedVersionId: string | null;
  version: AdminDatasetVersionRecord;
}) => {
  return (
    <TableRow key={version.id}>
      <TableCell>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-medium">v{version.versionNumber}</p>
            {version.isActive ? <Badge variant="outline">Active</Badge> : null}
            {selectedVersionId === version.id ? (
              <Badge variant="secondary">Inspecting</Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground text-xs">
            {version.rowCount.toLocaleString()} rows
          </p>
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <p>{version.sourceRef ?? "Unavailable"}</p>
          <p className="text-muted-foreground text-xs">
            {version.publishedAt
              ? `Published ${formatAdminDateTime(version.publishedAt)}`
              : "Not published yet"}
          </p>
          {version.publishedByDisplayName || version.publishedByEmail ? (
            <p className="text-muted-foreground text-xs">
              {version.publishedByDisplayName ?? version.publishedByEmail}
            </p>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <VersionComparisonSummary version={version} />
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          {version.sources.length === 0 ? (
            <p className="text-muted-foreground text-xs">Direct output</p>
          ) : (
            version.sources.map((source) => (
              <p
                className="text-muted-foreground text-xs"
                key={source.versionId}
              >
                {source.datasetName} · v{source.versionNumber ?? "?"} ·{" "}
                {source.relationType}
              </p>
            ))
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1 text-xs">
          <p>{version.notes ?? "No notes yet."}</p>
          <p className="text-muted-foreground">
            {version.changeSummary ?? "No change summary yet."}
          </p>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button asChild size="sm" variant="ghost">
            <Link href={buildPublishingHref(datasetId, version.id)}>
              Inspect
            </Link>
          </Button>
          {version.isActive ? null : (
            <form action={activateDatasetVersionAction}>
              <input name="datasetId" type="hidden" value={datasetId} />
              <input name="datasetVersionId" type="hidden" value={version.id} />
              <ConfirmSubmitButton
                confirmLabel="Activate version"
                idleLabel="Activate"
                variant="default"
              />
            </form>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};

export const AdminPublishingPageView = ({
  datasets,
  publishRuns,
  selectedDataset,
  selectedDatasetId,
  selectedVersion,
  selectedVersionId,
  versionEvents,
  versions,
}: AdminPublishingPageData) => {
  const notesFieldId = selectedVersion
    ? `publishing-notes-${selectedVersion.version.id}`
    : undefined;
  const changeSummaryFieldId = selectedVersion
    ? `publishing-change-summary-${selectedVersion.version.id}`
    : undefined;

  return (
    <AdminModuleShell
      description="Inspect lineage, compare versions, annotate releases, and switch the active dataset version through the grounded dataset-centric publish flow."
      route={routes.adminPublishing}
      title="Publishing"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Datasets</CardTitle>
            <CardDescription>
              Select a dataset to inspect its version lineage, history, and
              publication state.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {datasets.map((dataset) => (
              <Link
                className={
                  dataset.id === selectedDatasetId
                    ? "block rounded-lg border border-orange-200 bg-orange-50 px-4 py-3"
                    : "block rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50"
                }
                href={buildPublishingHref(dataset.id)}
                key={dataset.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-medium">{dataset.name}</p>
                    <p className="text-muted-foreground text-sm">
                      {dataset.slug}
                    </p>
                  </div>
                  <Badge
                    className={visibilityBadgeClassName[dataset.visibility]}
                  >
                    {visibilityLabel[dataset.visibility]}
                  </Badge>
                </div>
                <p className="mt-2 text-muted-foreground text-xs">
                  Active version {dataset.activeVersionNumber ?? "not set"} ·{" "}
                  {dataset.versionCount} total versions
                </p>
              </Link>
            ))}
          </CardContent>
        </Card>
        {selectedDataset && selectedVersion ? (
          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedDataset.name} · v
                    {selectedVersion.version.versionNumber}
                  </CardTitle>
                  <CardDescription>
                    Version details, publication metadata, and operator-facing
                    notes for the selected version.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <dl className="grid grid-cols-1 gap-3 text-sm">
                    <div className="flex items-center justify-between gap-6">
                      <dt className="text-muted-foreground">Status</dt>
                      <dd className="font-medium">
                        {selectedVersion.version.isActive
                          ? "Active"
                          : "Inactive"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-6">
                      <dt className="text-muted-foreground">Rows</dt>
                      <dd className="font-medium">
                        {selectedVersion.version.rowCount.toLocaleString()}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-6">
                      <dt className="text-muted-foreground">Created</dt>
                      <dd className="font-medium">
                        {formatAdminDateTime(selectedVersion.version.createdAt)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-6">
                      <dt className="text-muted-foreground">Published</dt>
                      <dd className="font-medium">
                        {selectedVersion.version.publishedAt
                          ? formatAdminDateTime(
                              selectedVersion.version.publishedAt
                            )
                          : "Not published"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-6">
                      <dt className="text-muted-foreground">Published by</dt>
                      <dd className="font-medium">
                        {selectedVersion.version.publishedByDisplayName ??
                          selectedVersion.version.publishedByEmail ??
                          "Unknown"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-6">
                      <dt className="text-muted-foreground">Source ref</dt>
                      <dd className="font-mono text-xs">
                        {selectedVersion.version.sourceRef ?? "Unavailable"}
                      </dd>
                    </div>
                  </dl>
                  <form
                    action={updateDatasetVersionNotesAction}
                    className="space-y-4"
                  >
                    <input
                      name="datasetId"
                      type="hidden"
                      value={selectedDataset.id}
                    />
                    <input
                      name="datasetVersionId"
                      type="hidden"
                      value={selectedVersion.version.id}
                    />
                    <label className="grid gap-2" htmlFor={notesFieldId}>
                      <span className="font-medium text-sm">
                        Operator notes
                      </span>
                      <Textarea
                        defaultValue={selectedVersion.version.notes ?? ""}
                        id={notesFieldId}
                        name="notes"
                        placeholder="Capture rollout notes, operator context, or rollback guidance."
                      />
                    </label>
                    <label
                      className="grid gap-2"
                      htmlFor={changeSummaryFieldId}
                    >
                      <span className="font-medium text-sm">
                        Change summary
                      </span>
                      <Textarea
                        defaultValue={
                          selectedVersion.version.changeSummary ?? ""
                        }
                        id={changeSummaryFieldId}
                        name="changeSummary"
                        placeholder="Summarize what changed in this version."
                      />
                    </label>
                    <div className="flex justify-end">
                      <Button type="submit" variant="outline">
                        Save notes
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Lineage</CardTitle>
                  <CardDescription>
                    Recursive version ancestry for the selected dataset version.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedVersion.lineageGraph ? (
                    <>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-lg border bg-muted/20 px-4 py-3">
                          <p className="text-muted-foreground text-xs">
                            Direct sources
                          </p>
                          <p className="font-semibold text-lg">
                            {selectedVersion.lineageGraph.directSourceCount}
                          </p>
                        </div>
                        <div className="rounded-lg border bg-muted/20 px-4 py-3">
                          <p className="text-muted-foreground text-xs">
                            Total ancestors
                          </p>
                          <p className="font-semibold text-lg">
                            {selectedVersion.lineageGraph.totalAncestorCount}
                          </p>
                        </div>
                        <div className="rounded-lg border bg-muted/20 px-4 py-3">
                          <p className="text-muted-foreground text-xs">
                            Max depth
                          </p>
                          <p className="font-semibold text-lg">
                            {selectedVersion.lineageGraph.maxDepth}
                          </p>
                        </div>
                      </div>
                      <div className="rounded-lg border bg-muted/10 px-4 py-4">
                        <p className="font-medium text-sm">
                          Resolved ancestry graph
                        </p>
                        <div className="mt-3 space-y-2">
                          {selectedVersion.lineageGraph.nodes.map((node) => (
                            <div
                              className="rounded-md border bg-background px-3 py-2 text-sm"
                              key={node.versionId}
                              style={{ marginLeft: `${node.depth * 0.75}rem` }}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {node.datasetName} · v{node.versionNumber}
                                </span>
                                {node.isSelected ? (
                                  <Badge variant="secondary">Selected</Badge>
                                ) : null}
                              </div>
                              <p className="text-muted-foreground text-xs">
                                {node.datasetSlug}
                                {node.relationTypes.length > 0
                                  ? ` · ${node.relationTypes.join(", ")}`
                                  : ""}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-lg border border-dashed px-4 py-4">
                        <p className="font-medium text-sm">
                          Pipeline contract notes
                        </p>
                        <div className="mt-2 space-y-1 text-muted-foreground text-xs">
                          {selectedVersion.pipelineContractNotes.map((note) => (
                            <p key={note}>{note}</p>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-lg border border-dashed px-4 py-6 text-muted-foreground text-sm">
                      This version does not currently resolve a lineage graph.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Activation and publish history</CardTitle>
                <CardDescription>
                  Activation is rollback-safe by reactivating a prior version
                  through the same transactional flow.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VersionEventHistoryTable events={versionEvents} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Publishing operations</CardTitle>
                <CardDescription>
                  Operational wrapper history around the existing activation
                  flow. The authoritative domain history remains in dataset
                  version events.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PublishingOperationsTable publishRuns={publishRuns} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Version catalog</CardTitle>
                <CardDescription>
                  Compare inactive versions to the active baseline, inspect
                  lineage sources, and reactivate prior versions when needed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Version</TableHead>
                      <TableHead>Published</TableHead>
                      <TableHead>Comparison to active</TableHead>
                      <TableHead>Sources</TableHead>
                      <TableHead>Operator metadata</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {versions.map((version) => (
                      <AdminPublishingVersionRow
                        datasetId={selectedDataset.id}
                        key={version.id}
                        selectedVersionId={selectedVersionId}
                        version={version}
                      />
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No datasets found</CardTitle>
              <CardDescription>
                Publishing controls will appear here once the catalog contains
                datasets and versions.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </AdminModuleShell>
  );
};
