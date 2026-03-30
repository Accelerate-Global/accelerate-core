import Link from "next/link";

import { Badge } from "@/components/ui/badge";
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
import { activateDatasetVersionAction } from "@/features/admin/datasets/actions";
import type { AdminPublishingPageData } from "@/features/admin/publishing/server";
import {
  type AdminDatasetVersionRecord,
  formatAdminDateTime,
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

const AdminPublishingVersionRow = ({
  datasetId,
  version,
}: {
  datasetId: string;
  version: AdminDatasetVersionRecord;
}) => {
  return (
    <TableRow key={version.id}>
      <TableCell className="font-medium">v{version.versionNumber}</TableCell>
      <TableCell>{version.rowCount.toLocaleString()}</TableCell>
      <TableCell>
        <div className="space-y-1">
          <p>{version.sourceRef ?? "Unavailable"}</p>
          {version.isDerived ? (
            <p className="text-muted-foreground text-xs">
              Derived from {version.sourceCount}{" "}
              {version.sourceCount === 1 ? "source version" : "source versions"}
            </p>
          ) : null}
          {version.sources.length > 0 ? (
            <ul className="space-y-1 text-muted-foreground text-xs">
              {version.sources.map((source) => (
                <li key={source.versionId}>
                  <Link
                    className="underline-offset-4 hover:underline"
                    href={`${routes.adminPublishing}?datasetId=${source.datasetId}`}
                  >
                    {source.datasetName}
                  </Link>{" "}
                  · v{source.versionNumber ?? "?"} · {source.relationType}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </TableCell>
      <TableCell>{formatAdminDateTime(version.createdAt)}</TableCell>
      <TableCell>
        {version.isActive ? (
          <Badge variant="outline">Active</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">Inactive</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        {version.isActive ? null : (
          <form
            action={activateDatasetVersionAction}
            className="flex justify-end"
          >
            <input name="datasetId" type="hidden" value={datasetId} />
            <input name="datasetVersionId" type="hidden" value={version.id} />
            <ConfirmSubmitButton
              confirmLabel="Activate version"
              idleLabel="Set active"
              variant="default"
            />
          </form>
        )}
      </TableCell>
    </TableRow>
  );
};

export const AdminPublishingPageView = ({
  datasets,
  selectedDataset,
  selectedDatasetId,
  versions,
}: AdminPublishingPageData) => {
  return (
    <AdminModuleShell
      description="Inspect dataset versions and switch the active version without inventing a separate publish-state machine."
      route={routes.adminPublishing}
      title="Publishing"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Datasets</CardTitle>
            <CardDescription>
              Select a dataset to inspect its versions and active publication
              target.
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
                href={`${routes.adminPublishing}?datasetId=${dataset.id}`}
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
        {selectedDataset ? (
          <Card>
            <CardHeader>
              <CardTitle>{selectedDataset.name}</CardTitle>
              <CardDescription>
                Activate a version to control which dataset version is treated
                as current in the existing schema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {versions.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-6 text-muted-foreground text-sm">
                  No dataset versions are available yet for this dataset.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Version</TableHead>
                      <TableHead>Rows</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {versions.map((version) => (
                      <AdminPublishingVersionRow
                        datasetId={selectedDataset.id}
                        key={version.id}
                        version={version}
                      />
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
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
