import Link from "next/link";

import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { AdminSidebarNav } from "@/components/layout/admin-sidebar-nav";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { requireCurrentProfile } from "@/lib/auth";
import { routes } from "@/lib/routes";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const profile = await requireCurrentProfile();

  if (profile.app_role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
        <AccessDeniedState
          action={
            <Button asChild>
              <Link href={routes.appHome}>Back to app</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-100">
      <AdminSidebarNav />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-background text-foreground">
        <Topbar email={profile.email} fullName={profile.full_name} />
        <main className="flex flex-1 flex-col p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
