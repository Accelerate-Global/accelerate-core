import { AdminUsersPageView } from "@/features/admin/users/page";
import { loadAdminUsersPage } from "@/features/admin/users/server";

interface AdminUsersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  const pageData = await loadAdminUsersPage(await searchParams);

  return <AdminUsersPageView {...pageData} />;
}
