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
import {
  formatAdminDateTime,
  type OperationRunStatus,
  operationRunStatusLabel,
} from "@/features/admin/shared";
import { AdminModuleShell } from "@/features/admin/ui/admin-module-shell";
import { routes } from "@/lib/routes";

import {
  toggleRegisteredSourceEnabledAction,
  triggerRegisteredSourceReadAction,
} from "./actions";
import type {
  AdminIngestionRunDetail,
  AdminIngestionRunsPageData,
  AdminPipelineRunDetail,
  AdminPipelineRunsPageData,
} from "./server";
import { isDeferredPipelineRun } from "./server";
import { RegisteredSourceForm } from "./source-form";

const operationStatusBadgeClassName: Record<OperationRunStatus, string> = {
  failed: "border-red-200 bg-red-50 text-red-700",
  queued: "border-zinc-200 bg-zinc-100 text-zinc-700",
  running: "border-blue-200 bg-blue-50 text-blue-700",
  succeeded: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const getIngestionRunsHref = (sourceId?: string, runId?: string): string => {
  const params = new URLSearchParams();

  if (sourceId) {
    params.set("sourceId", sourceId);
  }

  if (runId) {
    params.set("runId", runId);
  }

  const query = params.toString();

  return query
    ? `${routes.adminIngestionRuns}?${query}`
    : routes.adminIngestionRuns;
};

const getPipelineRunsHref = (runId?: string): string => {
  const params = new URLSearchParams();

  if (runId) {
    params.set("runId", runId);
  }

  const query = params.toString();

  return query
    ? `${routes.adminPipelineRuns}?${query}`
    : routes.adminPipelineRuns;
};

const getRegisteredSourceFormDefaults = (
  source?: {
    description: string | null;
    id: string;
    isEnabled: boolean;
    name: string;
    range: string;
    sheetName: string;
    spreadsheetId: string;
  } | null
) => {
  if (!source) {
    return {
      description: "",
      isEnabled: true,
      name: "",
      range: "",
      sheetName: "",
      sourceId: undefined,
      spreadsheetId: "",
    };
  }

  return {
    description: source.description ?? "",
    isEnabled: source.isEnabled,
    name: source.name,
    range: source.range,
    sheetName: source.sheetName,
    sourceId: source.id,
    spreadsheetId: source.spreadsheetId,
  };
};

const RunStatusBadge = ({ status }: { status: OperationRunStatus }) => {
  return (
    <Badge className={operationStatusBadgeClassName[status]}>
      {operationRunStatusLabel[status]}
    </Badge>
  );
};

const buildStablePreviewKeys = (values: string[]) => {
  const occurrences = new Map<string, number>();

  return values.map((value) => {
    const nextOccurrence = (occurrences.get(value) ?? 0) + 1;

    occurrences.set(value, nextOccurrence);

    return {
      key: `${value || "blank"}-${nextOccurrence}`,
      value,
    };
  });
};

const IngestionRunDetailCard = ({
  detail,
}: {
  detail: AdminIngestionRunDetail | null;
}) => {
  if (!detail) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Run details</CardTitle>
          <CardDescription>
            Select a run to inspect bounded source-read metadata.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const previewHeaders =
    detail.storedHeaders.length > 0
      ? detail.storedHeaders
      : Array.from(
          {
            length: detail.sampleRows.reduce((maxColumns, row) => {
              return Math.max(maxColumns, row.length);
            }, 0),
          },
          (_, index) => `Column ${index + 1}`
        );
  const previewColumns = buildStablePreviewKeys(previewHeaders);
  const previewRows = buildStablePreviewKeys(
    detail.sampleRows.map((row) => JSON.stringify(row))
  ).map((entry, index) => ({
    key: `${detail.run.id}-${entry.key}`,
    values: detail.sampleRows[index] ?? [],
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Run details</CardTitle>
            <CardDescription>
              Inspect the exact bounded metadata captured for this source-read
              operation.
            </CardDescription>
          </div>
          <RunStatusBadge status={detail.run.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2 text-sm">
            <p className="font-medium">Source snapshot</p>
            {detail.sourceConfigLines.map((line) => (
              <p className="text-muted-foreground" key={line}>
                {line}
              </p>
            ))}
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-medium">Run summary</p>
            {detail.metadataLines.map((line) => (
              <p className="text-muted-foreground" key={line}>
                {line}
              </p>
            ))}
          </div>
        </div>
        {detail.run.errorMessage ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive text-sm">
            {detail.run.errorMessage}
          </div>
        ) : null}
        {detail.truncatedNotes.length > 0 ? (
          <div className="space-y-2 rounded-lg border bg-muted/20 px-4 py-3 text-sm">
            <p className="font-medium">Bounded storage notes</p>
            {detail.truncatedNotes.map((line) => (
              <p className="text-muted-foreground" key={line}>
                {line}
              </p>
            ))}
          </div>
        ) : null}
        <div className="space-y-3">
          <div>
            <p className="font-medium text-sm">Stored sample rows</p>
            <p className="text-muted-foreground text-sm">
              Stored strictly for bounded operator inspection, not as staging or
              publishable data.
            </p>
          </div>
          {detail.sampleRows.length === 0 ? (
            <div className="rounded-lg border bg-muted/20 px-4 py-3 text-muted-foreground text-sm">
              No sample rows were stored for this run.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {previewColumns.map((column) => (
                      <TableHead key={column.key}>{column.value}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row) => (
                    <TableRow key={row.key}>
                      {previewColumns.map((column, columnIndex) => (
                        <TableCell key={`${row.key}-${column.key}`}>
                          {row.values[columnIndex] ?? ""}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const AdminIngestionRunsPageView = ({
  runs,
  selectedRun,
  selectedSource,
  selectedSourceId,
  sources,
}: AdminIngestionRunsPageData) => {
  return (
    <AdminModuleShell
      description="Register bounded sources, trigger source reads, and inspect durable ingestion history without turning this phase into a background job system."
      route={routes.adminIngestionRuns}
      title="Ingestion Runs"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Register source</CardTitle>
            <CardDescription>
              Phase B stores non-secret source metadata only. Credentials stay
              in environment-level secret storage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RegisteredSourceForm
              defaultValues={getRegisteredSourceFormDefaults()}
              mode="create"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedSource ? "Edit selected source" : "Source details"}
            </CardTitle>
            <CardDescription>
              {selectedSource
                ? "Light edits only: name, description, bounded range, and enabled state."
                : "Select a source from the registry to edit its bounded non-secret configuration."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedSource ? (
              <>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
                    <p className="font-medium">Slug</p>
                    <p className="text-muted-foreground">
                      {selectedSource.slug}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
                    <p className="font-medium">Ingestion runs</p>
                    <p className="text-muted-foreground">
                      {selectedSource.ingestionRunCount.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
                    <p className="font-medium">Pipeline scaffold runs</p>
                    <p className="text-muted-foreground">
                      {selectedSource.pipelineRunCount.toLocaleString()}
                    </p>
                  </div>
                </div>
                <RegisteredSourceForm
                  defaultValues={getRegisteredSourceFormDefaults({
                    description: selectedSource.description,
                    id: selectedSource.id,
                    isEnabled: selectedSource.isEnabled,
                    name: selectedSource.name,
                    range: selectedSource.range,
                    sheetName: selectedSource.sheetName,
                    spreadsheetId: selectedSource.spreadsheetId,
                  })}
                  mode="edit"
                />
              </>
            ) : (
              <div className="rounded-lg border bg-muted/20 px-4 py-3 text-muted-foreground text-sm">
                No sources are registered yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered sources</CardTitle>
          <CardDescription>
            Trigger the first bounded Google Sheets read here. Successful runs
            create downstream scaffold rows only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Config</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Last run</TableHead>
                <TableHead>History</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.length === 0 ? (
                <TableRow>
                  <TableCell className="text-muted-foreground" colSpan={6}>
                    No sources are registered yet.
                  </TableCell>
                </TableRow>
              ) : null}
              {sources.map((source) => (
                <TableRow key={source.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{source.name}</p>
                        {source.id === selectedSourceId ? (
                          <Badge variant="secondary">Inspecting</Badge>
                        ) : null}
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {source.slug}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {source.connectorKind}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <p>{source.sheetName || "No sheet name"}</p>
                    <p className="text-muted-foreground text-xs">
                      {source.range || "No range"} /{" "}
                      {source.spreadsheetId || "No spreadsheet id"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-2">
                      <Badge
                        className={
                          source.isEnabled
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-zinc-200 bg-zinc-100 text-zinc-700"
                        }
                      >
                        {source.isEnabled ? "Enabled" : "Disabled"}
                      </Badge>
                      {source.lastRunStatus ? (
                        <RunStatusBadge status={source.lastRunStatus} />
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          Never run
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {source.lastRunAt
                      ? formatAdminDateTime(source.lastRunAt)
                      : "Never run"}
                  </TableCell>
                  <TableCell className="text-sm">
                    <p>{source.ingestionRunCount.toLocaleString()} ingestion</p>
                    <p className="text-muted-foreground text-xs">
                      {source.pipelineRunCount.toLocaleString()} deferred
                      pipeline
                    </p>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button asChild size="sm" variant="ghost">
                        <Link href={getIngestionRunsHref(source.id)}>
                          Inspect
                        </Link>
                      </Button>
                      <form action={toggleRegisteredSourceEnabledAction}>
                        <input
                          name="sourceId"
                          type="hidden"
                          value={source.id}
                        />
                        <input
                          name="nextEnabled"
                          type="hidden"
                          value={source.isEnabled ? "false" : "true"}
                        />
                        <Button size="sm" type="submit" variant="outline">
                          {source.isEnabled ? "Disable" : "Enable"}
                        </Button>
                      </form>
                      <form action={triggerRegisteredSourceReadAction}>
                        <input
                          name="sourceId"
                          type="hidden"
                          value={source.id}
                        />
                        <Button
                          disabled={!source.isEnabled}
                          size="sm"
                          type="submit"
                        >
                          Run read
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Run history</CardTitle>
            <CardDescription>
              {selectedSource
                ? `Ingestion history for ${selectedSource.name}.`
                : "Select a source to focus its run history."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested by</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead className="text-right">Inspect</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-muted-foreground" colSpan={6}>
                      No ingestion runs exist for the current source selection.
                    </TableCell>
                  </TableRow>
                ) : null}
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>{formatAdminDateTime(run.createdAt)}</TableCell>
                    <TableCell>
                      <RunStatusBadge status={run.status} />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p>
                          {run.requestedByDisplayName ?? "Unknown operator"}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {run.requestedByEmail ?? "Email unavailable"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{formatAdminDateTime(run.startedAt)}</TableCell>
                    <TableCell>
                      {formatAdminDateTime(run.completedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="ghost">
                        <Link href={getIngestionRunsHref(run.sourceId, run.id)}>
                          Inspect
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <IngestionRunDetailCard detail={selectedRun} />
      </div>
    </AdminModuleShell>
  );
};

const PipelineRunDetailCard = ({
  detail,
}: {
  detail: AdminPipelineRunDetail | null;
}) => {
  if (!detail) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Run details</CardTitle>
          <CardDescription>
            Select a deferred pipeline scaffold run to inspect its metadata.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Run details</CardTitle>
            <CardDescription>
              This section remains explicitly scaffold-only in Phase B.
            </CardDescription>
          </div>
          <RunStatusBadge status={detail.run.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {detail.metadataLines.map((line) => (
          <p className="text-muted-foreground" key={line}>
            {line}
          </p>
        ))}
        {detail.run.errorMessage ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive text-sm">
            {detail.run.errorMessage}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export const AdminPipelineRunsPageView = ({
  runs,
  selectedRun,
}: AdminPipelineRunsPageData) => {
  return (
    <AdminModuleShell
      description="Inspect the downstream scaffold rows created by successful source reads. This page does not represent executed pipeline jobs yet."
      route={routes.adminPipelineRuns}
      title="Pipeline Runs"
    >
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Deferred scaffold only</CardTitle>
              <CardDescription>
                These rows exist so future connectors and background execution
                can reuse a durable operational model. Phase B does not execute
                downstream pipeline steps.
              </CardDescription>
            </div>
            <Badge className="border-orange-200 bg-orange-50 text-orange-700">
              Deferred scaffold only
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Run history</CardTitle>
            <CardDescription>
              Every row here should remain visibly non-executing until a future
              pipeline phase adds real orchestration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Requested by</TableHead>
                  <TableHead className="text-right">Inspect</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-muted-foreground" colSpan={6}>
                      No pipeline scaffold runs have been recorded yet.
                    </TableCell>
                  </TableRow>
                ) : null}
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>{formatAdminDateTime(run.createdAt)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p>{run.sourceName}</p>
                        <p className="text-muted-foreground text-xs">
                          {run.sourceSlug}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        <RunStatusBadge status={run.status} />
                        {isDeferredPipelineRun(run) ? (
                          <Badge
                            className="border-orange-200 bg-orange-50 text-orange-700"
                            variant="outline"
                          >
                            Deferred
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {run.executionMode}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p>
                          {run.requestedByDisplayName ?? "Unknown operator"}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {run.requestedByEmail ?? "Email unavailable"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="ghost">
                        <Link href={getPipelineRunsHref(run.id)}>Inspect</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <PipelineRunDetailCard detail={selectedRun} />
      </div>
    </AdminModuleShell>
  );
};
