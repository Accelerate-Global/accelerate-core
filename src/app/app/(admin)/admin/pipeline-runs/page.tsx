import { AdminOversightPageView } from "@/features/admin/operations/page";
import { loadAdminOversightPage } from "@/features/admin/operations/server";

export default async function AdminPipelineRunsPage() {
  const pageData = await loadAdminOversightPage("pipeline-runs");

  return <AdminOversightPageView {...pageData} />;
}
