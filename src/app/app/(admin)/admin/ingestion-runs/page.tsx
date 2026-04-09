import { AdminIngestionRunsPageView } from "@/features/admin/operations/page";
import { loadAdminIngestionRunsPage } from "@/features/admin/operations/server";

interface AdminIngestionRunsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminIngestionRunsPage({
  searchParams,
}: AdminIngestionRunsPageProps) {
  const pageData = await loadAdminIngestionRunsPage(await searchParams);

  return <AdminIngestionRunsPageView {...pageData} />;
}
