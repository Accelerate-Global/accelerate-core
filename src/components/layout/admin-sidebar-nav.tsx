"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { adminNavItems } from "@/components/layout/nav-items";
import { isRouteActive, routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

const AdminSidebarNav = () => {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-zinc-800 border-r bg-[#18181b] text-zinc-50">
      <Link
        className="flex h-[52px] items-center gap-2 border-zinc-800 border-b px-4 text-sm text-zinc-400 transition-colors hover:text-zinc-50"
        href={routes.appHome}
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        <span>Back to app</span>
      </Link>
      <div className="px-4 py-4">
        <p className="font-semibold text-xs text-zinc-100 uppercase tracking-[0.12em]">
          Administration
        </p>
      </div>
      <nav aria-label="Admin navigation" className="flex-1 px-2 pb-3">
        <ul className="space-y-1">
          {adminNavItems.map((item) => {
            const isActive = isRouteActive(pathname, item.href);

            return (
              <li key={item.href}>
                <Link
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#18181b]",
                    isActive
                      ? "bg-zinc-800 font-medium text-zinc-50"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50"
                  )}
                  href={item.href}
                >
                  <item.icon aria-hidden="true" className="size-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export { AdminSidebarNav };
