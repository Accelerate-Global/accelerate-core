import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { DatasetDirectory } from "@/features/datasets/browser/dataset-directory";
import type { WorkspacePageData } from "@/features/workspaces/server";
import { routes } from "@/lib/routes";

const workspaceRoleLabel = {
  admin: "Admin",
  member: "Member",
  owner: "Owner",
} as const;

const getWorkspacePageDescription = (
  selectedWorkspaceName: string | null
): string => {
  if (selectedWorkspaceName) {
    return `Datasets owned by or shared to ${selectedWorkspaceName}.`;
  }

  return "Workspace-scoped and shared datasets across all readable workspaces.";
};

export const WorkspacePageView = ({
  datasets,
  memberships,
  selectedWorkspaceId,
  selectedWorkspaceName,
}: WorkspacePageData) => {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        description="Review your workspace memberships, role context, and the datasets that belong to or are shared with those workspaces."
        route={routes.workspace}
        title="Workspace"
        zone="Product"
      />
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <CardTitle>Your workspaces</CardTitle>
            <CardDescription>
              {memberships.length === 0
                ? "No readable workspaces are available for this account yet."
                : `${memberships.length.toLocaleString()} readable workspaces are available in this account context.`}
            </CardDescription>
          </div>
          <form className="grid gap-3 sm:grid-cols-[minmax(0,18rem)_auto]">
            <label className="grid gap-2" htmlFor="workspace-filter">
              <span className="font-medium text-sm">Workspace filter</span>
              <Select
                defaultValue={selectedWorkspaceId ?? "all"}
                id="workspace-filter"
                name="workspaceId"
              >
                <option value="all">All my workspaces</option>
                {memberships.map((membership) => (
                  <option
                    key={membership.workspace.id}
                    value={membership.workspace.id}
                  >
                    {membership.workspace.name}
                  </option>
                ))}
              </Select>
            </label>
            <div className="flex items-end gap-2">
              <Button type="submit" variant="outline">
                Apply
              </Button>
              {selectedWorkspaceId ? (
                <Button asChild variant="ghost">
                  <Link href={routes.workspace}>Clear</Link>
                </Button>
              ) : null}
            </div>
          </form>
        </CardHeader>
        <CardContent>
          {memberships.length === 0 ? (
            <EmptyState
              description="Once this account joins a workspace, its role and workspace-relevant datasets will appear here."
              title="No workspaces available"
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {memberships.map((membership) => (
                <Card key={membership.workspace.id}>
                  <CardHeader className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-lg">
                        {membership.workspace.name}
                      </CardTitle>
                      <Badge variant="outline">
                        {membership.role
                          ? workspaceRoleLabel[membership.role]
                          : "Readable"}
                      </Badge>
                    </div>
                    <CardDescription>
                      {membership.workspace.slug}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-muted-foreground text-sm">
                      {membership.workspace.description ??
                        "No workspace description is available yet."}
                    </p>
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={`${routes.workspace}?workspaceId=${membership.workspace.id}`}
                      >
                        Filter to workspace
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <div className="space-y-3">
        <div className="space-y-1">
          <h2 className="font-semibold text-2xl tracking-tight">
            Workspace datasets
          </h2>
          <p className="text-muted-foreground text-sm leading-6">
            {getWorkspacePageDescription(selectedWorkspaceName)}
          </p>
        </div>
        <DatasetDirectory datasets={datasets} />
      </div>
    </section>
  );
};
