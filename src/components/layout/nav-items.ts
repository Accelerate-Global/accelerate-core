import type { LucideIcon } from "lucide-react";
import {
  ArrowDownToLine,
  Briefcase,
  Database,
  GitBranch,
  House,
  KeyRound,
  LayoutDashboard,
  MailPlus,
  PlugZap,
  Send,
  Shield,
  UserRound,
  Users,
} from "lucide-react";

import { type AppRoute, routes } from "@/lib/routes";

interface ShellNavItem {
  href: AppRoute;
  icon: LucideIcon;
  label: string;
}

export const productNavItems = [
  {
    href: routes.appHome,
    icon: House,
    label: "Home",
  },
  {
    href: routes.datasets,
    icon: Database,
    label: "Datasets",
  },
  {
    href: routes.workspace,
    icon: Briefcase,
    label: "Workspace",
  },
  {
    href: routes.profile,
    icon: UserRound,
    label: "Profile",
  },
  {
    href: routes.adminHome,
    icon: Shield,
    label: "Admin",
  },
] as const satisfies readonly ShellNavItem[];

export const adminNavItems = [
  {
    href: routes.adminHome,
    icon: LayoutDashboard,
    label: "Overview",
  },
  {
    href: routes.adminUsers,
    icon: Users,
    label: "Users",
  },
  {
    href: routes.adminInvites,
    icon: MailPlus,
    label: "Invites",
  },
  {
    href: routes.adminPermissions,
    icon: KeyRound,
    label: "Permissions",
  },
  {
    href: routes.adminDatasets,
    icon: Database,
    label: "Datasets",
  },
  {
    href: routes.adminApis,
    icon: PlugZap,
    label: "APIs",
  },
  {
    href: routes.adminIngestionRuns,
    icon: ArrowDownToLine,
    label: "Ingestion Runs",
  },
  {
    href: routes.adminPipelineRuns,
    icon: GitBranch,
    label: "Pipeline Runs",
  },
  {
    href: routes.adminPublishing,
    icon: Send,
    label: "Publishing",
  },
] as const satisfies readonly ShellNavItem[];
