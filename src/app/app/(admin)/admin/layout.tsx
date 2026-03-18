import { AdminSidebarNav } from "@/components/layout/admin-sidebar-nav";
import { Topbar } from "@/components/layout/topbar";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen bg-zinc-100">
      <AdminSidebarNav />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-background text-foreground">
        <Topbar />
        <main className="flex flex-1 flex-col p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
