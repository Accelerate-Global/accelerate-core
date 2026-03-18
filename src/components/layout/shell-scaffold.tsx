import { LayoutDashboard, Settings2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const productNavItems = [
  "Home",
  "Datasets",
  "Workspace",
  "Profile",
  "Admin",
] as const;

const adminNavItems = [
  "Overview",
  "Users",
  "Invites",
  "Permissions",
  "Datasets",
  "APIs",
  "Ingestion Runs",
  "Pipeline Runs",
  "Publishing",
] as const;

export const ProductSidebarScaffold = () => {
  return (
    <aside className="hidden w-72 border-r bg-background lg:flex lg:flex-col">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LayoutDashboard aria-hidden="true" className="size-4" />
          </div>
          <div>
            <p className="font-semibold text-sm">Accelerate</p>
            <p className="text-muted-foreground text-xs">Product shell</p>
          </div>
        </div>
        <Badge variant="secondary">T4 next</Badge>
      </div>
      <nav
        aria-label="Product navigation placeholder"
        className="flex-1 px-3 py-4"
      >
        <ul className="space-y-2">
          {productNavItems.map((item) => (
            <li
              className="flex items-center gap-3 rounded-lg border border-border/80 border-dashed px-3 py-2 text-sm"
              key={item}
            >
              <Skeleton className="size-4 rounded-full" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export const AdminSidebarScaffold = () => {
  return (
    <aside className="hidden w-72 border-white/10 border-r bg-zinc-950 text-zinc-50 lg:flex lg:flex-col">
      <div className="border-white/10 border-b px-5 py-4">
        <Badge
          className="mb-4 bg-zinc-800 text-zinc-100 hover:bg-zinc-800"
          variant="secondary"
        >
          Admin shell
        </Badge>
        <div className="space-y-1">
          <p className="font-semibold text-sm">Administration</p>
          <p className="text-xs text-zinc-400">
            T4 will replace this placeholder nav.
          </p>
        </div>
      </div>
      <nav
        aria-label="Admin navigation placeholder"
        className="flex-1 px-3 py-4"
      >
        <ul className="space-y-2">
          {adminNavItems.map((item) => (
            <li
              className="flex items-center gap-3 rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-100"
              key={item}
            >
              <Skeleton className="size-4 rounded-full bg-zinc-700" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

interface ShellTopbarScaffoldProps {
  title: string;
}

export const ShellTopbarScaffold = ({ title }: ShellTopbarScaffoldProps) => {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur sm:px-6">
      <div className="space-y-1">
        <p className="font-medium text-sm tracking-tight">{title}</p>
        <p className="text-muted-foreground text-xs">
          Temporary shell chrome until shared navigation lands.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="outline">Phase 1</Badge>
        <div className="flex size-9 items-center justify-center rounded-full border bg-muted text-muted-foreground">
          <Settings2 aria-hidden="true" className="size-4" />
        </div>
      </div>
    </header>
  );
};
