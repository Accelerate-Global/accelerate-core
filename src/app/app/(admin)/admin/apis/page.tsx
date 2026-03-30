import { AdminOversightPageView } from "@/features/admin/operations/page";
import { loadAdminOversightPage } from "@/features/admin/operations/server";

export default async function AdminApisPage() {
  const pageData = await loadAdminOversightPage("apis");

  return <AdminOversightPageView {...pageData} />;
}
