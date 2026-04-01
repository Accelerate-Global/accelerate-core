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
  grantUserDatasetAccessAction,
  grantWorkspaceDatasetAccessAction,
  revokeUserDatasetAccessAction,
  revokeWorkspaceDatasetAccessAction,
} from "@/features/admin/permissions/actions";
import type { AdminPermissionsPageData } from "@/features/admin/permissions/server";
import { formatAdminDateTime, visibilityLabel } from "@/features/admin/shared";
import { AdminModuleShell } from "@/features/admin/ui/admin-module-shell";
import { ConfirmSubmitButton } from "@/features/admin/ui/confirm-submit-button";
import { routes } from "@/lib/routes";

const visibilityBadgeClassName = {
  global: "border-emerald-200 bg-emerald-50 text-emerald-700",
  private: "border-zinc-200 bg-zinc-100 text-zinc-700",
  shared: "border-blue-200 bg-blue-50 text-blue-700",
  workspace: "border-orange-200 bg-orange-50 text-orange-700",
} as const;

export const AdminPermissionsPageView = ({
  authMetadataAvailable,
  datasets,
  grantableUsers,
  grantableWorkspaces,
  selectedDatasetId,
  selectedDetails,
}: AdminPermissionsPageData) => {
  return (
    <AdminModuleShell
      description="Inspect dataset access through the Phase 7 visibility model, with shared access centered on owner and approved workspaces."
      route={routes.adminPermissions}
      title="Permissions"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Datasets</CardTitle>
            <CardDescription>
              Select a dataset to inspect direct grants and workspace grants in
              the context of its current visibility model.
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
                href={`${routes.adminPermissions}?datasetId=${dataset.id}`}
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
                  {dataset.directUserGrantCount} user grants ·{" "}
                  {dataset.workspaceGrantCount} workspace grants
                </p>
              </Link>
            ))}
          </CardContent>
        </Card>
        {selectedDetails ? (
          <div className="space-y-6">
            <Card>
              <CardHeader className="gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>{selectedDetails.dataset.name}</CardTitle>
                  <Badge
                    className={
                      visibilityBadgeClassName[
                        selectedDetails.dataset.visibility
                      ]
                    }
                  >
                    {visibilityLabel[selectedDetails.dataset.visibility]}
                  </Badge>
                  {selectedDetails.dataset.isDefaultGlobal ? (
                    <Badge variant="outline">Default global</Badge>
                  ) : null}
                </div>
                <CardDescription>
                  {selectedDetails.groundedAccessRule}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-muted/20 px-4 py-3">
                  <p className="font-medium text-sm">Owner workspace</p>
                  <p className="mt-1 text-muted-foreground text-sm">
                    {selectedDetails.dataset.ownerWorkspaceName ?? "None"}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/20 px-4 py-3">
                  <p className="font-medium text-sm">Publishing</p>
                  <p className="mt-1 text-muted-foreground text-sm">
                    Active version{" "}
                    {selectedDetails.dataset.activeVersionNumber ?? "not set"}
                  </p>
                </div>
              </CardContent>
            </Card>
            {authMetadataAvailable ? null : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-sm">
                User email enrichment is currently unavailable. Permission
                management still works from app tables.
              </div>
            )}
            {selectedDetails.dataset.visibility === "shared" ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-blue-800 text-sm">
                Shared datasets now use owner-workspace and approved-workspace
                access as the primary model. Any direct user grants shown below
                are legacy compatibility grants and should usually be revoked
                instead of expanded.
              </div>
            ) : null}
            <Card>
              <CardHeader>
                <CardTitle>Grant direct user access</CardTitle>
                <CardDescription>
                  New direct user grants are only supported for private
                  datasets.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedDetails.dataset.visibility === "private" ? (
                  <form
                    action={grantUserDatasetAccessAction}
                    className="flex flex-col gap-3 sm:flex-row"
                  >
                    <input
                      name="datasetId"
                      type="hidden"
                      value={selectedDetails.dataset.id}
                    />
                    <Select defaultValue="" name="userId" required>
                      <option disabled value="">
                        Select a user
                      </option>
                      {grantableUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.label}
                          {user.description ? ` · ${user.description}` : ""}
                        </option>
                      ))}
                    </Select>
                    <Button
                      disabled={grantableUsers.length === 0}
                      type="submit"
                      variant="outline"
                    >
                      Grant user
                    </Button>
                  </form>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Shared datasets remain workspace-centered in Phase 7, and
                    workspace/global datasets do not accept direct user grants.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Grant workspace access</CardTitle>
                <CardDescription>
                  Shared datasets always include the owner workspace implicitly.
                  Use explicit grants here only for additional approved
                  workspaces.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedDetails.dataset.visibility === "shared" ? (
                  <form
                    action={grantWorkspaceDatasetAccessAction}
                    className="flex flex-col gap-3 sm:flex-row"
                  >
                    <input
                      name="datasetId"
                      type="hidden"
                      value={selectedDetails.dataset.id}
                    />
                    <Select defaultValue="" name="workspaceId" required>
                      <option disabled value="">
                        Select a workspace
                      </option>
                      {grantableWorkspaces.map((workspace) => (
                        <option key={workspace.id} value={workspace.id}>
                          {workspace.label}
                          {workspace.description
                            ? ` · ${workspace.description}`
                            : ""}
                        </option>
                      ))}
                    </Select>
                    <Button
                      disabled={grantableWorkspaces.length === 0}
                      type="submit"
                      variant="outline"
                    >
                      Grant workspace
                    </Button>
                  </form>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Workspace grants do not affect access for the current
                    visibility mode.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Direct user access</CardTitle>
                <CardDescription>
                  Private datasets use these grants as their primary access
                  path. Shared datasets only retain them for backward
                  compatibility when they already exist.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Granted by</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedDetails.userGrants.length === 0 ? (
                      <TableRow>
                        <TableCell
                          className="text-muted-foreground"
                          colSpan={4}
                        >
                          No direct user grants are recorded for this dataset.
                        </TableCell>
                      </TableRow>
                    ) : null}
                    {selectedDetails.userGrants.map((grant) => (
                      <TableRow key={grant.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">
                              {grant.userDisplayName ?? "Unnamed user"}
                            </p>
                            <p className="text-muted-foreground text-sm">
                              {grant.userEmail ?? grant.userId}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {grant.grantedByDisplayName ??
                            grant.grantedByEmail ??
                            "Unknown"}
                        </TableCell>
                        <TableCell>
                          {formatAdminDateTime(grant.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <form
                            action={revokeUserDatasetAccessAction}
                            className="flex justify-end"
                          >
                            <input
                              name="accessId"
                              type="hidden"
                              value={grant.id}
                            />
                            <input
                              name="datasetId"
                              type="hidden"
                              value={selectedDetails.dataset.id}
                            />
                            <ConfirmSubmitButton
                              confirmLabel="Remove grant"
                              idleLabel="Revoke"
                              variant="destructive"
                            />
                          </form>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Workspace access</CardTitle>
                <CardDescription>
                  Owner workspace access is implicit for workspace and shared
                  datasets.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Workspace</TableHead>
                      <TableHead>Granted by</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedDetails.workspaceGrants.length === 0 ? (
                      <TableRow>
                        <TableCell
                          className="text-muted-foreground"
                          colSpan={4}
                        >
                          No workspace grants are recorded for this dataset.
                        </TableCell>
                      </TableRow>
                    ) : null}
                    {selectedDetails.workspaceGrants.map((grant) => (
                      <TableRow key={grant.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium">
                                {grant.workspaceName}
                              </p>
                              {grant.isImplicit ? (
                                <Badge variant="outline">Owner workspace</Badge>
                              ) : null}
                            </div>
                            <p className="text-muted-foreground text-sm">
                              {grant.workspaceSlug}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {grant.grantedByDisplayName ??
                            grant.grantedByEmail ??
                            "Unknown"}
                        </TableCell>
                        <TableCell>
                          {formatAdminDateTime(grant.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          {grant.isImplicit ? (
                            <span className="text-muted-foreground text-sm">
                              Implicit
                            </span>
                          ) : (
                            <form
                              action={revokeWorkspaceDatasetAccessAction}
                              className="flex justify-end"
                            >
                              <input
                                name="accessId"
                                type="hidden"
                                value={grant.id}
                              />
                              <input
                                name="datasetId"
                                type="hidden"
                                value={selectedDetails.dataset.id}
                              />
                              <ConfirmSubmitButton
                                confirmLabel="Remove grant"
                                idleLabel="Revoke"
                                variant="destructive"
                              />
                            </form>
                          )}
                        </TableCell>
                      </TableRow>
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
                Dataset permissions will appear here once datasets exist in the
                catalog.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </AdminModuleShell>
  );
};
