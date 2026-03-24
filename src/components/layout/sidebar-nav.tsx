"use client";

import { ChevronLeft, ChevronRight, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";

import {
  adminNavItems,
  productNavItems,
  type ShellNavItem,
} from "@/components/layout/nav-items";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type AppRoute, isRouteActive } from "@/lib/routes";
import { cn } from "@/lib/utils";

interface SidebarNavProps {
  backLink?: {
    href: AppRoute;
    label: string;
  };
  shellDescription: string;
  shellTitle: string;
  variant: "admin" | "product";
}

const SidebarNav = ({
  backLink,
  shellDescription,
  shellTitle,
  variant,
}: SidebarNavProps) => {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isAdminVariant = variant === "admin";
  const items = isAdminVariant ? adminNavItems : productNavItems;

  const renderNavLink = (item: ShellNavItem): ReactNode => {
    const isActive = isRouteActive(pathname, item.href);
    let stateClasses =
      "text-muted-foreground hover:bg-accent/60 hover:text-foreground focus-visible:ring-ring";

    if (isAdminVariant && isActive) {
      stateClasses =
        "bg-zinc-800 text-zinc-50 focus-visible:ring-zinc-400 focus-visible:ring-offset-zinc-950";
    } else if (isAdminVariant) {
      stateClasses =
        "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50 focus-visible:ring-zinc-400 focus-visible:ring-offset-zinc-950";
    } else if (isActive) {
      stateClasses = "bg-accent text-accent-foreground focus-visible:ring-ring";
    }

    const link = (
      <Link
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex items-center rounded-lg font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          isCollapsed ? "h-10 justify-center px-0" : "gap-3 px-3 py-2",
          stateClasses
        )}
        href={item.href}
      >
        <item.icon aria-hidden="true" className="size-4 shrink-0" />
        {isCollapsed ? (
          <span className="sr-only">{item.label}</span>
        ) : (
          item.label
        )}
      </Link>
    );

    if (!isCollapsed) {
      return link;
    }

    return (
      <Tooltip key={item.href}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={cn(
          "flex shrink-0 flex-col border-r transition-[width] duration-200 ease-out",
          isAdminVariant
            ? "border-zinc-800 bg-zinc-950 text-zinc-50"
            : "border-r bg-background",
          isCollapsed ? "w-14" : "w-60"
        )}
      >
        <div
          className={cn(
            "flex items-center border-b",
            isCollapsed
              ? "flex-col gap-2 px-2 py-2"
              : "h-[52px] justify-between px-4"
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LayoutDashboard aria-hidden="true" className="size-4" />
            </div>
            {isCollapsed ? null : (
              <div className="min-w-0">
                <p className="truncate font-semibold text-sm">{shellTitle}</p>
                <p
                  className={cn(
                    "truncate text-xs",
                    isAdminVariant ? "text-zinc-400" : "text-muted-foreground"
                  )}
                >
                  {shellDescription}
                </p>
              </div>
            )}
          </div>
          <Button
            aria-controls="shell-navigation"
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => {
              setIsCollapsed((currentState) => !currentState);
            }}
            size="icon"
            type="button"
            variant={isAdminVariant ? "secondary" : "ghost"}
          >
            {isCollapsed ? (
              <ChevronRight aria-hidden="true" className="size-4" />
            ) : (
              <ChevronLeft aria-hidden="true" className="size-4" />
            )}
          </Button>
        </div>
        <nav
          aria-label="Application navigation"
          className="flex-1 px-2 py-3"
          id="shell-navigation"
        >
          <ul className="space-y-1">
            {items.map((item) => {
              return <li key={item.href}>{renderNavLink(item)}</li>;
            })}
          </ul>
        </nav>
        {backLink ? (
          <div className="border-t px-2 py-3">
            {renderNavLink({
              href: backLink.href,
              icon: ChevronLeft,
              label: backLink.label,
            })}
          </div>
        ) : null}
      </aside>
    </TooltipProvider>
  );
};

export { SidebarNav };
