import { requireCurrentProfile } from "@/lib/auth";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default async function AppLayout({ children }: AppLayoutProps) {
  await requireCurrentProfile();

  return children;
}
