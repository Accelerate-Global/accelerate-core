export const routes = {
  root: "/",
  login: "/login",
  invite: "/invite/[token]",
  authCallback: "/auth/callback",
  authSetupIncomplete: "/auth/setup-incomplete",
  appHome: "/app",
  datasets: "/app/datasets",
  datasetDetail: "/app/datasets/[datasetId]",
  profile: "/app/profile",
  workspace: "/app/workspace",
  adminHome: "/app/admin",
  adminUsers: "/app/admin/users",
  adminInvites: "/app/admin/invites",
  adminPermissions: "/app/admin/permissions",
  adminDatasets: "/app/admin/datasets",
  adminApis: "/app/admin/apis",
  adminIngestionRuns: "/app/admin/ingestion-runs",
  adminPipelineRuns: "/app/admin/pipeline-runs",
  adminPublishing: "/app/admin/publishing",
} as const;

export type AppRoute = (typeof routes)[keyof typeof routes];

export type AppZone = "Public" | "Product" | "Admin";

const routeTitles = {
  [routes.root]: "Home",
  [routes.login]: "Login",
  [routes.invite]: "Accept Invite",
  [routes.authCallback]: "Auth Callback",
  [routes.authSetupIncomplete]: "Account Setup Incomplete",
  [routes.appHome]: "Home",
  [routes.datasets]: "Datasets",
  [routes.datasetDetail]: "Dataset",
  [routes.profile]: "Profile",
  [routes.workspace]: "Workspace",
  [routes.adminHome]: "Overview",
  [routes.adminUsers]: "Users",
  [routes.adminInvites]: "Invites",
  [routes.adminPermissions]: "Permissions",
  [routes.adminDatasets]: "Datasets",
  [routes.adminApis]: "APIs",
  [routes.adminIngestionRuns]: "Ingestion Runs",
  [routes.adminPipelineRuns]: "Pipeline Runs",
  [routes.adminPublishing]: "Publishing",
} as const satisfies Record<AppRoute, string>;

interface DynamicRouteTitle {
  matches: (pathname: string) => boolean;
  title: string;
}

const dynamicRouteTitles = [
  {
    matches: (pathname: string) => pathname.startsWith("/invite/"),
    title: routeTitles[routes.invite],
  },
  {
    matches: (pathname: string) => pathname.startsWith("/app/datasets/"),
    title: routeTitles[routes.datasetDetail],
  },
] as const satisfies readonly DynamicRouteTitle[];

const formatRouteSegment = (segment: string): string => {
  return segment
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
};

const getRoutePrefix = (href: string): string => {
  return href.replace(/\/\[[^/]+\]/g, "");
};

export const isRouteActive = (pathname: string, href: AppRoute): boolean => {
  if (
    href === routes.root ||
    href === routes.appHome ||
    href === routes.adminHome
  ) {
    return pathname === href;
  }

  const prefix = getRoutePrefix(href);

  return pathname === prefix || pathname.startsWith(`${prefix}/`);
};

export const getRouteZone = (pathname: string): AppZone => {
  if (
    pathname === routes.adminHome ||
    pathname.startsWith(`${routes.adminHome}/`)
  ) {
    return "Admin";
  }

  if (
    pathname === routes.appHome ||
    pathname.startsWith(`${routes.appHome}/`)
  ) {
    return "Product";
  }

  return "Public";
};

export const getRouteTitle = (pathname: string): string => {
  if (Object.hasOwn(routeTitles, pathname)) {
    return routeTitles[pathname as AppRoute];
  }

  for (const route of dynamicRouteTitles) {
    if (route.matches(pathname)) {
      return route.title;
    }
  }

  const lastSegment = pathname.split("/").filter(Boolean).at(-1);

  if (!lastSegment) {
    return routeTitles[routes.root];
  }

  return formatRouteSegment(lastSegment);
};

export const getTopbarTitle = (pathname: string): string => {
  const title = getRouteTitle(pathname);
  const zone = getRouteZone(pathname);

  if (zone === "Admin") {
    return `Admin — ${title}`;
  }

  return title;
};
