import { AdminOversightPageView } from "@/features/admin/operations/page";
import { loadAdminOversightPage } from "@/features/admin/operations/server";

export default async function AdminIngestionRunsPage() {
  const pageData = await loadAdminOversightPage("ingestion-runs");

  return <AdminOversightPageView {...pageData} />;
}
