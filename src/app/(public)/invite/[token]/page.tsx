import { RoutePlaceholder } from "@/features/scaffold/route-placeholder";
import { routes } from "@/lib/routes";

interface InvitePageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  await params;

  return <RoutePlaceholder route={routes.invite} />;
}
