import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Topbar } from "@/components/layout/topbar";
import { requireCurrentProfile } from "@/lib/auth";

interface ProductLayoutProps {
  children: React.ReactNode;
}

export default async function ProductLayout({
  children,
}: ProductLayoutProps) {
  const profile = await requireCurrentProfile();

  return (
    <div className="flex min-h-screen bg-muted/20">
      <SidebarNav appRole={profile.app_role} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar email={profile.email} fullName={profile.full_name} />
        <main className="flex flex-1 flex-col p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
