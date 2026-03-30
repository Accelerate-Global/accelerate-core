import { AppShell } from "@/components/layout/app-shell";
import { adminNavItems } from "@/components/layout/nav-items";
import { requireCurrentUserAdminOrRedirect } from "@/lib/auth/server";
import { routes } from "@/lib/routes";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  await requireCurrentUserAdminOrRedirect();

  return (
    <AppShell
      backLink={{
        href: routes.appHome,
        label: "Back to app",
      }}
      navItems={adminNavItems}
      shellDescription="Admin and operations zone"
      shellTitle="Accelerate Admin"
      variant="admin"
    >
      {children}
    </AppShell>
  );
}
