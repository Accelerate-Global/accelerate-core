import { AdminApisPageView } from "@/features/admin/apis/page";
import { loadAdminApisPage } from "@/features/admin/apis/server";

export default async function AdminApisPage() {
  const pageData = await loadAdminApisPage();

  return <AdminApisPageView {...pageData} />;
}
