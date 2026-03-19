"use client";

import { usePathname } from "next/navigation";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { signOut } from "@/lib/auth/actions";
import { getTopbarTitle } from "@/lib/routes";

interface TopbarProps {
  email: string;
  fullName: string | null;
}

const getAvatarInitials = (fullName: string | null, email: string): string => {
  const nameParts = fullName?.trim().split(/\s+/).filter(Boolean) ?? [];

  if (nameParts.length > 0) {
    const firstInitial = nameParts[0]?.charAt(0) ?? "";
    const lastInitial = nameParts.at(-1)?.charAt(0) ?? "";

    return `${firstInitial}${lastInitial}`.toUpperCase();
  }

  return email.slice(0, 2).toUpperCase();
};

const Topbar = ({ email, fullName }: TopbarProps) => {
  const pathname = usePathname();
  const title = getTopbarTitle(pathname);
  const displayName = fullName?.trim() || email;
  const initials = getAvatarInitials(fullName, email);

  return (
    <header className="flex h-[52px] items-center justify-between border-b bg-background px-4 sm:px-6">
      <h1 className="truncate font-semibold text-sm sm:text-base">{title}</h1>
      <Popover>
        <PopoverTrigger asChild>
          <button
            aria-label="Open user menu"
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            type="button"
          >
            <Avatar className="size-8 border">
              <AvatarFallback className="bg-muted font-medium text-muted-foreground text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 p-0">
          <div className="flex flex-col">
            <div className="border-b px-4 py-3">
              <p className="truncate font-medium text-sm">{displayName}</p>
              <p className="truncate text-muted-foreground text-sm">{email}</p>
            </div>
            <form action={signOut}>
              <button
                className="w-full px-4 py-3 text-left font-medium text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                type="submit"
              >
                Sign out
              </button>
            </form>
          </div>
        </PopoverContent>
      </Popover>
    </header>
  );
};

export { Topbar };
