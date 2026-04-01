import { AdminPublishingPageView } from "@/features/admin/publishing/page";
import { loadAdminPublishingPage } from "@/features/admin/publishing/server";

interface AdminPublishingPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminPublishingPage({
  searchParams,
}: AdminPublishingPageProps) {
  const pageData = await loadAdminPublishingPage(await searchParams);

  return <AdminPublishingPageView {...pageData} />;
}
