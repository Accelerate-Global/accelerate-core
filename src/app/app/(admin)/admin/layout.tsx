import { AppShell } from "@/components/layout/app-shell";
import { routes } from "@/lib/routes";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AppShell
      backLink={{
        href: routes.appHome,
        label: "Back to app",
      }}
      shellDescription="Admin and operations zone"
      shellTitle="Accelerate Admin"
      variant="admin"
    >
      {children}
    </AppShell>
  );
}
