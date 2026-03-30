import { AdminDashboardPageView } from "@/features/admin/overview/page";
import { loadAdminDashboardPage } from "@/features/admin/overview/server";

export default async function AdminOverviewPage() {
  const pageData = await loadAdminDashboardPage();

  return <AdminDashboardPageView {...pageData} />;
}
