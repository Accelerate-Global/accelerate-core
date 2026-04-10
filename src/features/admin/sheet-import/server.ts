import "server-only";

import { listAdminDatasets } from "@/features/admin/server";
import { requireCurrentUserAdmin } from "@/lib/auth/server";

export interface SheetImportPageData {
  datasets: { id: string; name: string; slug: string }[];
  defaultRange: string;
  defaultSheetName: string;
  defaultSpreadsheetId: string;
}

const DEFAULT_SHEET_NAME = "PGAC Titled 1";
const DEFAULT_RANGE = "A1:ZZ2000";

export const loadSheetImportPage = async (): Promise<SheetImportPageData> => {
  await requireCurrentUserAdmin();
  const datasets = await listAdminDatasets();
  const defaultSpreadsheetId =
    process.env.GOOGLE_WORKSPACE_SOURCE_SPREADSHEET_ID?.trim() ?? "";
  const defaultSheetName =
    process.env.GOOGLE_WORKSPACE_SOURCE_SHEET_NAME?.trim() ||
    DEFAULT_SHEET_NAME;
  const defaultRange =
    process.env.GOOGLE_WORKSPACE_SOURCE_RANGE?.trim() || DEFAULT_RANGE;

  return {
    datasets: datasets.map((d) => ({
      id: d.id,
      name: d.name,
      slug: d.slug,
    })),
    defaultRange,
    defaultSheetName,
    defaultSpreadsheetId,
  };
};
