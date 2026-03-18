import {
  AdminSidebarScaffold,
  ShellTopbarScaffold,
} from "@/components/layout/shell-scaffold";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="dark min-h-screen bg-zinc-100 lg:flex">
      <AdminSidebarScaffold />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-background text-foreground">
        <ShellTopbarScaffold title="Admin zone" />
        <main className="flex flex-1 flex-col p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
