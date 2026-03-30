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
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  setDefaultGlobalDatasetAction,
  updateDatasetVisibilityAction,
} from "@/features/admin/datasets/actions";
import type { AdminDatasetsPageData } from "@/features/admin/datasets/server";
import {
  type AdminDatasetRecord,
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

const getOwnerWorkspaceSummary = (
  dataset: AdminDatasetRecord
): string | null => {
  if (dataset.visibility === "shared") {
    return `${dataset.sharedWorkspaceCount.toLocaleString()} approved ${
      dataset.sharedWorkspaceCount === 1 ? "workspace" : "workspaces"
    }`;
  }

  if (dataset.visibility === "workspace" && dataset.ownerWorkspaceName) {
    return "Owner workspace only";
  }

  return null;
};

const getActiveVersionSummary = (
  dataset: AdminDatasetRecord
): string | null => {
  if (dataset.activeVersionIsDerived) {
    return `Derived from ${dataset.activeVersionSourceCount.toLocaleString()} ${
      dataset.activeVersionSourceCount === 1 ? "source" : "sources"
    }`;
  }

  if (dataset.activeVersionNumber) {
    return "Direct output";
  }

  return null;
};

const AdminDatasetTableRow = ({ dataset }: { dataset: AdminDatasetRecord }) => {
  const ownerWorkspaceSummary = getOwnerWorkspaceSummary(dataset);
  const activeVersionSummary = getActiveVersionSummary(dataset);

  return (
    <TableRow key={dataset.id}>
      <TableCell>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{dataset.name}</p>
            {dataset.isDefaultGlobal ? (
              <Badge variant="outline">Default global</Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground text-sm">{dataset.slug}</p>
        </div>
      </TableCell>
      <TableCell>
        <Badge className={visibilityBadgeClassName[dataset.visibility]}>
          {visibilityLabel[dataset.visibility]}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <p>{dataset.ownerWorkspaceName ?? "None"}</p>
          {ownerWorkspaceSummary ? (
            <p className="text-muted-foreground text-xs">
              {ownerWorkspaceSummary}
            </p>
          ) : null}
        </div>
      </TableCell>
      <TableCell>{dataset.versionCount.toLocaleString()}</TableCell>
      <TableCell>
        <div className="space-y-1">
          <p>
            {dataset.activeVersionNumber
              ? `v${dataset.activeVersionNumber}`
              : "Not set"}
          </p>
          {activeVersionSummary ? (
            <p className="text-muted-foreground text-xs">
              {activeVersionSummary}
            </p>
          ) : null}
        </div>
      </TableCell>
      <TableCell>{formatAdminDateTime(dataset.updatedAt)}</TableCell>
      <TableCell>
        <div className="space-y-3">
          <form
            action={updateDatasetVisibilityAction}
            className="flex flex-col gap-2"
          >
            <input name="datasetId" type="hidden" value={dataset.id} />
            <Select defaultValue={dataset.visibility} name="nextVisibility">
              <option value="global">Global</option>
              <option value="private">Private</option>
              <option disabled={!dataset.ownerWorkspaceId} value="workspace">
                Workspace
              </option>
              <option disabled={!dataset.ownerWorkspaceId} value="shared">
                Shared
              </option>
            </Select>
            <Button size="sm" type="submit" variant="outline">
              Update visibility
            </Button>
          </form>
          {dataset.visibility === "global" && !dataset.isDefaultGlobal ? (
            <form action={setDefaultGlobalDatasetAction}>
              <input name="datasetId" type="hidden" value={dataset.id} />
              <ConfirmSubmitButton
                confirmLabel="Set default"
                idleLabel="Make default global"
                variant="default"
              />
            </form>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button asChild size="sm" variant="ghost">
            <Link href={`${routes.adminPermissions}?datasetId=${dataset.id}`}>
              Permissions
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`${routes.adminPublishing}?datasetId=${dataset.id}`}>
              Publishing
            </Link>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export const AdminDatasetsPageView = ({
  datasets,
  query,
  visibilityFilter,
}: AdminDatasetsPageData) => {
  return (
    <AdminModuleShell
      description="Manage the existing dataset catalog, visibility posture, and default-global behavior without turning admin operations into a second ingestion surface."
      route={routes.adminDatasets}
      title="Datasets"
    >
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <CardTitle>Catalog</CardTitle>
            <CardDescription>
              Visibility and default-global controls are grounded in the current
              dataset schema and constraints.
            </CardDescription>
          </div>
          <form className="grid gap-3 sm:grid-cols-[minmax(0,18rem)_10rem_auto]">
            <label className="grid gap-2" htmlFor="admin-datasets-search">
              <span className="font-medium text-sm">Search</span>
              <Input
                defaultValue={query}
                id="admin-datasets-search"
                name="q"
                placeholder="Dataset or workspace"
              />
            </label>
            <label className="grid gap-2" htmlFor="admin-datasets-visibility">
              <span className="font-medium text-sm">Visibility</span>
              <Select
                defaultValue={visibilityFilter}
                id="admin-datasets-visibility"
                name="visibility"
              >
                <option value="all">All visibility</option>
                <option value="global">Global</option>
                <option value="private">Private</option>
                <option value="shared">Shared</option>
                <option value="workspace">Workspace</option>
              </Select>
            </label>
            <div className="flex items-end">
              <Button type="submit" variant="outline">
                Apply
              </Button>
            </div>
          </form>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dataset</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead>Owner workspace</TableHead>
                <TableHead>Versions</TableHead>
                <TableHead>Active version</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Manage</TableHead>
                <TableHead className="text-right">Publishing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {datasets.length === 0 ? (
                <TableRow>
                  <TableCell className="text-muted-foreground" colSpan={8}>
                    No datasets match the current filters.
                  </TableCell>
                </TableRow>
              ) : null}
              {datasets.map((dataset) => (
                <AdminDatasetTableRow dataset={dataset} key={dataset.id} />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminModuleShell>
  );
};
