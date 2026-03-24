"use client";

import { Shield } from "lucide-react";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { getTopbarTitle } from "@/lib/routes";

interface TopbarProps {
  note: string;
  variant: "admin" | "product";
}

const Topbar = ({ note, variant }: TopbarProps) => {
  const pathname = usePathname();
  const title = getTopbarTitle(pathname);

  return (
    <header className="flex h-[52px] items-center justify-between border-b bg-background px-4 sm:px-6">
      <div className="min-w-0">
        <h1 className="truncate font-semibold text-sm sm:text-base">{title}</h1>
        <p className="truncate text-muted-foreground text-xs">{note}</p>
      </div>
      <Badge
        className={
          variant === "admin"
            ? "border-orange-200 bg-orange-50 text-orange-700"
            : "border-blue-200 bg-blue-50 text-blue-700"
        }
        variant="outline"
      >
        <Shield aria-hidden="true" className="size-3.5" />
        Phase 1
      </Badge>
    </header>
  );
};

export { Topbar };
