"use client";

import { usePathname } from "next/navigation";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getTopbarTitle } from "@/lib/routes";

const Topbar = () => {
  const pathname = usePathname();
  const title = getTopbarTitle(pathname);

  return (
    <header className="flex h-[52px] items-center justify-between border-b bg-background px-4 sm:px-6">
      <h1 className="truncate font-semibold text-sm sm:text-base">{title}</h1>
      <Avatar aria-label="User avatar placeholder" className="size-8 border">
        <AvatarFallback className="bg-muted font-medium text-muted-foreground text-xs">
          AG
        </AvatarFallback>
      </Avatar>
    </header>
  );
};

export { Topbar };
