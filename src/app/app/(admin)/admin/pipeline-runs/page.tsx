import { AdminPipelineRunsPageView } from "@/features/admin/operations/page";
import { loadAdminPipelineRunsPage } from "@/features/admin/operations/server";

interface AdminPipelineRunsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminPipelineRunsPage({
  searchParams,
}: AdminPipelineRunsPageProps) {
  const pageData = await loadAdminPipelineRunsPage(await searchParams);

  return <AdminPipelineRunsPageView {...pageData} />;
}
