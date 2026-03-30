import { type AppRoute, routes } from "@/lib/routes";

export type ShellNavIcon =
  | "admin"
  | "apis"
  | "back"
  | "datasets"
  | "home"
  | "ingestion-runs"
  | "invites"
  | "overview"
  | "permissions"
  | "pipeline-runs"
  | "profile"
  | "publishing"
  | "users"
  | "workspace";

export interface ShellNavItem {
  href: AppRoute;
  icon: ShellNavIcon;
  label: string;
}

const baseProductNavItems = [
  {
    href: routes.appHome,
    icon: "home",
    label: "Home",
  },
  {
    href: routes.datasets,
    icon: "datasets",
    label: "Datasets",
  },
  {
    href: routes.workspace,
    icon: "workspace",
    label: "Workspace",
  },
  {
    href: routes.profile,
    icon: "profile",
    label: "Profile",
  },
] as const satisfies readonly ShellNavItem[];

const productAdminNavItem = {
  href: routes.adminHome,
  icon: "admin",
  label: "Admin",
} as const satisfies ShellNavItem;

export const getProductNavItems = (
  showAdminEntry: boolean
): readonly ShellNavItem[] => {
  if (!showAdminEntry) {
    return baseProductNavItems;
  }

  return [...baseProductNavItems, productAdminNavItem];
};

export const adminNavItems = [
  {
    href: routes.adminHome,
    icon: "overview",
    label: "Overview",
  },
  {
    href: routes.adminUsers,
    icon: "users",
    label: "Users",
  },
  {
    href: routes.adminInvites,
    icon: "invites",
    label: "Invites",
  },
  {
    href: routes.adminPermissions,
    icon: "permissions",
    label: "Permissions",
  },
  {
    href: routes.adminDatasets,
    icon: "datasets",
    label: "Datasets",
  },
  {
    href: routes.adminApis,
    icon: "apis",
    label: "APIs",
  },
  {
    href: routes.adminIngestionRuns,
    icon: "ingestion-runs",
    label: "Ingestion Runs",
  },
  {
    href: routes.adminPipelineRuns,
    icon: "pipeline-runs",
    label: "Pipeline Runs",
  },
  {
    href: routes.adminPublishing,
    icon: "publishing",
    label: "Publishing",
  },
] as const satisfies readonly ShellNavItem[];
