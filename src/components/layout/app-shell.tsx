import type { ReactNode } from "react";

import type { ShellNavItem } from "@/components/layout/nav-items";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Topbar } from "@/components/layout/topbar";
import type { AppRoute } from "@/lib/routes";

interface AppShellProps {
  backLink?: {
    href: AppRoute;
    label: string;
  };
  children: ReactNode;
  navItems: readonly ShellNavItem[];
  shellDescription: string;
  shellTitle: string;
  variant: "admin" | "product";
}

export const AppShell = ({
  backLink,
  children,
  navItems,
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
        items={navItems}
        shellDescription={shellDescription}
        shellTitle={shellTitle}
        variant={variant}
      />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-background">
        <Topbar
          note={
            variant === "admin"
              ? "Administrative operations and dataset controls."
              : "Shared dataset browser for authenticated product access."
          }
          variant={variant}
        />
        <main className="flex flex-1 flex-col p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
};
