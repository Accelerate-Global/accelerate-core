import { WorkspacePageView } from "@/features/workspaces/page";
import { loadWorkspacePage } from "@/features/workspaces/server";

interface WorkspacePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function WorkspacePage({
  searchParams,
}: WorkspacePageProps) {
  const pageData = await loadWorkspacePage(await searchParams);

  return <WorkspacePageView {...pageData} />;
}
