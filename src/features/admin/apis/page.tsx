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
import type { AdminApisPageData } from "@/features/admin/apis/server";
import { formatAdminDateTime } from "@/features/admin/shared";
import { AdminModuleShell } from "@/features/admin/ui/admin-module-shell";
import { routes } from "@/lib/routes";

const StatusBadge = ({ enabled }: { enabled: boolean }) => {
  return enabled ? (
    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
      Enabled
    </Badge>
  ) : (
    <Badge className="border-zinc-200 bg-zinc-100 text-zinc-700">
      Disabled
    </Badge>
  );
};

const connectorHealthBadgeLabel = {
  "not-configured": "Not configured",
  ready: "Ready",
  "validation-failed": "Validation failed",
} as const;

const connectorHealthBadgeClassName = {
  "not-configured": "border-zinc-200 bg-zinc-100 text-zinc-700",
  ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
  "validation-failed": "border-orange-200 bg-orange-50 text-orange-700",
} as const;

const ConnectorHealthBadge = ({
  health,
}: {
  health: AdminApisPageData["googleWorkspace"]["health"];
}) => {
  return (
    <Badge className={connectorHealthBadgeClassName[health]}>
      {connectorHealthBadgeLabel[health]}
    </Badge>
  );
};

const GoogleWorkspacePreview = ({
  previewColumns,
  previewRows,
}: Pick<
  AdminApisPageData["googleWorkspace"],
  "previewColumns" | "previewRows"
>) => {
  if (previewColumns.length === 0 || previewRows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No preview values were returned for the selected range.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">Row</TableHead>
          {previewColumns.map((column) => (
            <TableHead key={column.key}>{column.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {previewRows.map((row) => (
          <TableRow key={row.index}>
            <TableCell className="font-medium">{row.index}</TableCell>
            {row.cells.map((cell, index) => (
              <TableCell
                key={`${row.index}-${previewColumns[index]?.key ?? index}`}
              >
                {cell || (
                  <span className="text-muted-foreground text-xs">Empty</span>
                )}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export const AdminApisPageView = ({
  featureFlags,
  googleWorkspace,
  manualPrerequisites,
  textToQuery,
  warehouse,
}: AdminApisPageData) => {
  return (
    <AdminModuleShell
      description="Admin-only integration surface for Google Workspace validation plus Phase 8 experimental warehouse and text-to-query scaffolding."
      route={routes.adminApis}
      title="APIs"
    >
      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Feature gates</CardTitle>
            <CardDescription>
              Experiments stay off by default and remain admin-gated until a
              human explicitly enables them.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span>Admin experiments</span>
              <StatusBadge enabled={featureFlags.adminExperimentsEnabled} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Text-to-query</span>
              <StatusBadge enabled={featureFlags.textToQueryEnabled} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Warehouse adapter</CardTitle>
            <CardDescription>
              Provider boundary only. No live warehouse execution is enabled in
              this phase.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Provider key:{" "}
              <span className="font-medium">{warehouse.key ?? "None"}</span>
            </p>
            <p>
              Configured:{" "}
              <span className="font-medium">
                {warehouse.isConfigured ? "Yes" : "No"}
              </span>
            </p>
            <div className="space-y-1 text-muted-foreground text-xs">
              {warehouse.details.map((detail) => (
                <p key={detail}>{detail}</p>
              ))}
            </div>
            <div className="space-y-1 text-xs">
              {warehouse.missingPrerequisites.map((item) => (
                <p className="text-muted-foreground" key={item}>
                  {item}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Text-to-query adapter</CardTitle>
            <CardDescription>
              Future text-to-query work must compile into the existing
              structured dataset query contract.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Provider key:{" "}
              <span className="font-medium">{textToQuery.key ?? "None"}</span>
            </p>
            <p>
              Contract target:{" "}
              <span className="font-mono text-xs">
                {textToQuery.contractTarget}
              </span>
            </p>
            <p>
              Allowlisted datasets:{" "}
              <span className="font-medium">
                {textToQuery.allowlistedDatasetIds.length > 0
                  ? textToQuery.allowlistedDatasetIds.join(", ")
                  : "None"}
              </span>
            </p>
            <div className="space-y-1 text-muted-foreground text-xs">
              {textToQuery.details.map((detail) => (
                <p key={detail}>{detail}</p>
              ))}
            </div>
            <div className="space-y-1 text-xs">
              {textToQuery.missingPrerequisites.map((item) => (
                <p className="text-muted-foreground" key={item}>
                  {item}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <CardTitle>Google Workspace connector</CardTitle>
              <CardDescription>
                Read-only validation for the first external source integration
                using one configured Google Sheet and service account.
              </CardDescription>
            </div>
            <ConnectorHealthBadge health={googleWorkspace.health} />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1 text-sm">
              <p className="font-medium">Configured</p>
              <p>{googleWorkspace.isConfigured ? "Yes" : "No"}</p>
            </div>
            <div className="space-y-1 text-sm">
              <p className="font-medium">Spreadsheet ID</p>
              <p className="break-all font-mono text-xs">
                {googleWorkspace.spreadsheetId ?? "Not set"}
              </p>
            </div>
            <div className="space-y-1 text-sm">
              <p className="font-medium">Spreadsheet title</p>
              <p>{googleWorkspace.spreadsheetTitle ?? "Unavailable"}</p>
            </div>
            <div className="space-y-1 text-sm">
              <p className="font-medium">Drive file name</p>
              <p>{googleWorkspace.driveFileName ?? "Unavailable"}</p>
            </div>
            <div className="space-y-1 text-sm">
              <p className="font-medium">Drive modified</p>
              <p>{formatAdminDateTime(googleWorkspace.driveModifiedTime)}</p>
            </div>
            <div className="space-y-1 text-sm">
              <p className="font-medium">Sheet / tab</p>
              <p>{googleWorkspace.sheetName ?? "Unavailable"}</p>
            </div>
            <div className="space-y-1 text-sm">
              <p className="font-medium">Effective range</p>
              <p className="break-all font-mono text-xs">
                {googleWorkspace.effectiveRange ?? "Unavailable"}
              </p>
            </div>
            <div className="space-y-1 text-sm">
              <p className="font-medium">Tab count</p>
              <p>
                {googleWorkspace.tabCount === null
                  ? "Unavailable"
                  : googleWorkspace.tabCount.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="font-medium text-sm">Status details</p>
                <div className="space-y-2 text-sm">
                  {googleWorkspace.details.map((detail) => (
                    <p
                      className="rounded-lg border bg-muted/20 px-4 py-3"
                      key={detail}
                    >
                      {detail}
                    </p>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="font-medium text-sm">Operator guidance</p>
                <div className="space-y-2 text-sm">
                  {googleWorkspace.missingPrerequisites.length > 0 ? (
                    googleWorkspace.missingPrerequisites.map((item) => (
                      <p
                        className="rounded-lg border bg-muted/20 px-4 py-3"
                        key={item}
                      >
                        {item}
                      </p>
                    ))
                  ) : (
                    <p className="rounded-lg border bg-muted/20 px-4 py-3">
                      No additional operator action is required for read-only
                      validation.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-sm">Preview</p>
              <GoogleWorkspacePreview
                previewColumns={googleWorkspace.previewColumns}
                previewRows={googleWorkspace.previewRows}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Manual prerequisites</CardTitle>
          <CardDescription>
            These decisions remain human-owned before warehouse or AI
            experiments can move beyond scaffolding.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {manualPrerequisites.map((item) => (
            <p className="rounded-lg border bg-muted/20 px-4 py-3" key={item}>
              {item}
            </p>
          ))}
        </CardContent>
      </Card>
    </AdminModuleShell>
  );
};
