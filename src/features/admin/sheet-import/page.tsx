import { FileSpreadsheet } from "lucide-react";

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
import { sourceReadBounds } from "@/features/admin/operations/source-config";
import { importGoogleSheetToDatasetAction } from "@/features/admin/sheet-import/actions";
import type { SheetImportPageData } from "@/features/admin/sheet-import/server";
import { AdminModuleShell } from "@/features/admin/ui/admin-module-shell";
import { routes } from "@/lib/routes";

export const SheetImportPageView = ({
  datasets,
  defaultRange,
  defaultSheetName,
  defaultSpreadsheetId,
}: SheetImportPageData) => {
  return (
    <AdminModuleShell
      description="Read the configured Google Sheet tab, create a new dataset version from the rows, and activate it so it appears in the product dataset browser."
      route={routes.adminSheetImport}
      title="Sheet import"
    >
      {datasets.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No datasets available</CardTitle>
            <CardDescription>
              Create or seed datasets in Supabase first, then return here to
              import sheet rows.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
      {datasets.length === 0 ? null : (
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <FileSpreadsheet
                aria-hidden="true"
                className="mt-0.5 size-8 shrink-0 text-muted-foreground"
              />
              <div className="space-y-1">
                <CardTitle>Import from Google Sheet</CardTitle>
                <CardDescription>
                  Uses server credentials (
                  <code className="text-xs">GOOGLE_SERVICE_ACCOUNT_JSON</code>
                  ). Defaults match your Workspace connector env when set (
                  <code className="text-xs">
                    GOOGLE_WORKSPACE_SOURCE_SPREADSHEET_ID
                  </code>
                  , optional sheet/range overrides). The tab{" "}
                  <strong>PGAC Titled 1</strong> is prefilled; adjust if your
                  sheet differs.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form
              action={importGoogleSheetToDatasetAction}
              className="space-y-6"
            >
              <div className="grid gap-2">
                <label className="font-medium text-sm" htmlFor="datasetId">
                  Target dataset
                </label>
                <Select
                  className="max-w-lg"
                  defaultValue=""
                  id="datasetId"
                  name="datasetId"
                  required
                >
                  <option disabled value="">
                    Choose a dataset
                  </option>
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.slug})
                    </option>
                  ))}
                </Select>
                <p className="text-muted-foreground text-sm">
                  A new version is published and set as the active version for
                  this dataset.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <label
                    className="font-medium text-sm"
                    htmlFor="spreadsheetId"
                  >
                    Spreadsheet ID
                  </label>
                  <Input
                    defaultValue={defaultSpreadsheetId}
                    id="spreadsheetId"
                    name="spreadsheetId"
                    placeholder="From the Sheet URL (between /d/ and /edit)"
                    required={!defaultSpreadsheetId}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="font-medium text-sm" htmlFor="sheetName">
                    Sheet / tab name
                  </label>
                  <Input
                    defaultValue={defaultSheetName}
                    id="sheetName"
                    name="sheetName"
                    placeholder="PGAC Titled 1"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <label className="font-medium text-sm" htmlFor="range">
                  A1 range (bounded)
                </label>
                <Input
                  defaultValue={defaultRange}
                  id="range"
                  name="range"
                  placeholder="A1:ZZ2000"
                />
                <p className="text-muted-foreground text-sm">
                  First row must be headers. At most{" "}
                  {sourceReadBounds.maxConfiguredRowSpan} rows and{" "}
                  {sourceReadBounds.maxHeaderCount} columns are imported
                  (connector limits).
                </p>
              </div>
              <Button type="submit">Query sheet and import into dataset</Button>
            </form>
          </CardContent>
        </Card>
      )}
    </AdminModuleShell>
  );
};
