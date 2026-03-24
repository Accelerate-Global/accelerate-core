import type { ReactNode } from "react";

import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Topbar } from "@/components/layout/topbar";
import type { AppRoute } from "@/lib/routes";

interface AppShellProps {
  backLink?: {
    href: AppRoute;
    label: string;
  };
  children: ReactNode;
  shellDescription: string;
  shellTitle: string;
  variant: "admin" | "product";
}

export const AppShell = ({
  backLink,
  children,
  shellDescription,
  shellTitle,
  variant,
}: AppShellProps) => {
  return (
    <div
      className={
        variant === "admin"
          ? "flex min-h-screen bg-zinc-950"
          : "flex min-h-screen bg-muted/30"
      }
    >
      <SidebarNav
        backLink={backLink}
        shellDescription={shellDescription}
        shellTitle={shellTitle}
        variant={variant}
      />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-background">
        <Topbar
          note={
            variant === "admin"
              ? "Admin and operations scaffold. Enforcement lands in Phase 2."
              : "Product shell scaffold. Authentication lands in Phase 2."
          }
          variant={variant}
        />
        <main className="flex flex-1 flex-col p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
};
