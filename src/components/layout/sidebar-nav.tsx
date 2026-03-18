"use client";

import { ChevronLeft, ChevronRight, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, type ReactNode, useState } from "react";

import { productNavItems } from "@/components/layout/nav-items";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isRouteActive, routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

const SidebarNav = () => {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const renderNavLink = (item: (typeof productNavItems)[number]): ReactNode => {
    const isActive = isRouteActive(pathname, item.href);
    const link = (
      <Link
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex items-center rounded-lg font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isCollapsed ? "h-10 justify-center px-0" : "gap-3 px-3 py-2",
          isActive
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
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
          "flex shrink-0 flex-col border-r bg-background transition-[width] duration-200 ease-out",
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
          <Link
            aria-label="Go to app home"
            className="flex min-w-0 items-center gap-3"
            href={routes.appHome}
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LayoutDashboard aria-hidden="true" className="size-4" />
            </div>
            {isCollapsed ? null : (
              <div className="min-w-0">
                <p className="truncate font-semibold text-sm">Accelerate</p>
                <p className="truncate text-muted-foreground text-xs">
                  Product shell
                </p>
              </div>
            )}
          </Link>
          <Button
            aria-controls="product-navigation"
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => {
              setIsCollapsed((currentState) => !currentState);
            }}
            size="icon"
            type="button"
            variant="ghost"
          >
            {isCollapsed ? (
              <ChevronRight aria-hidden="true" className="size-4" />
            ) : (
              <ChevronLeft aria-hidden="true" className="size-4" />
            )}
          </Button>
        </div>
        <nav
          aria-label="Product navigation"
          className="flex-1 px-2 py-3"
          id="product-navigation"
        >
          <ul className="space-y-1">
            {productNavItems.map((item, index) => {
              const isAdminItem = index === productNavItems.length - 1;

              return (
                <Fragment key={item.href}>
                  {isAdminItem ? (
                    <li aria-hidden="true" className="my-3 border-t" />
                  ) : null}
                  <li>{renderNavLink(item)}</li>
                </Fragment>
              );
            })}
          </ul>
        </nav>
      </aside>
    </TooltipProvider>
  );
};

export { SidebarNav };
