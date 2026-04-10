import { SheetImportPageView } from "@/features/admin/sheet-import/page";
import { loadSheetImportPage } from "@/features/admin/sheet-import/server";

export default async function AdminSheetImportPage() {
  const pageData = await loadSheetImportPage();

  return <SheetImportPageView {...pageData} />;
}
