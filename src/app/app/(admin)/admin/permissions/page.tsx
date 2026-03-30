import { AdminPermissionsPageView } from "@/features/admin/permissions/page";
import { loadAdminPermissionsPage } from "@/features/admin/permissions/server";

interface AdminPermissionsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminPermissionsPage({
  searchParams,
}: AdminPermissionsPageProps) {
  const pageData = await loadAdminPermissionsPage(await searchParams);

  return <AdminPermissionsPageView {...pageData} />;
}
