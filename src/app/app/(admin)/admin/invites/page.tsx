import { AdminInvitesPageView } from "@/features/admin/invites/page";
import { loadAdminInvitesPage } from "@/features/admin/invites/server";

interface AdminInvitesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminInvitesPage({
  searchParams,
}: AdminInvitesPageProps) {
  const pageData = await loadAdminInvitesPage(await searchParams);

  return <AdminInvitesPageView {...pageData} />;
}
