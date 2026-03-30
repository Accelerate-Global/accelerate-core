import { AdminDatasetsPageView } from "@/features/admin/datasets/page";
import { loadAdminDatasetsPage } from "@/features/admin/datasets/server";

interface AdminDatasetsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminDatasetsPage({
  searchParams,
}: AdminDatasetsPageProps) {
  const pageData = await loadAdminDatasetsPage(await searchParams);

  return <AdminDatasetsPageView {...pageData} />;
}
