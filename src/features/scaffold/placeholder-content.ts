import { type AppRoute, type AppZone, routes } from "@/lib/routes";

export interface PlaceholderDefinition {
  description: string;
  futurePurpose: string;
  title: string;
  zone: AppZone;
}

export const placeholderDefinitions = {
  [routes.root]: {
    description:
      "The repository root route exists only to hand users into the public entry path without adding a separate landing experience yet.",
    futurePurpose:
      "If the product later needs a marketing or onboarding landing page, it can be added without disturbing the public, product, and admin zone split.",
    title: "Home",
    zone: "Public",
  },
  [routes.login]: {
    description:
      "The public login entry point is wired into the App Router and ready for real invite-only authentication work.",
    futurePurpose:
      "Phase 2 will add the real magic-link sign-in flow, session handling, and invite-aware messaging here.",
    title: "Login",
    zone: "Public",
  },
  [routes.invite]: {
    description:
      "Invite links resolve into the public/auth zone, but the route currently stays at scaffold depth only.",
    futurePurpose:
      "Phase 2 will validate invite tokens, hand off to authentication, and attach access to the invited account.",
    title: "Accept Invite",
    zone: "Public",
  },
  [routes.authCallback]: {
    description:
      "The auth callback route is reserved and visible in the route map so Supabase auth can be integrated without moving files later.",
    futurePurpose:
      "Phase 2 will exchange auth state here and redirect into the product shell once sessions and access rules are implemented.",
    title: "Auth Callback",
    zone: "Public",
  },
  [routes.appHome]: {
    description:
      "The signed-in product shell starts here and separates user-facing browsing from admin operations.",
    futurePurpose:
      "Later phases will surface query-backed dataset activity, shortcuts, and workspace context on this landing page.",
    title: "Home",
    zone: "Product",
  },
  [routes.datasets]: {
    description:
      "Dataset discovery lives in the product zone and now has a stable route, layout, and navigation entry.",
    futurePurpose:
      "Later phases will add search, filters, query-backed browsing, and dataset summaries here.",
    title: "Datasets",
    zone: "Product",
  },
  [routes.datasetDetail]: {
    description:
      "Individual dataset pages are scaffolded so detail views can be added without changing the route map.",
    futurePurpose:
      "Later phases will show schema, freshness, permissions, and query-driven record exploration for a selected dataset.",
    title: "Dataset",
    zone: "Product",
  },
  [routes.profile]: {
    description:
      "Profile management has a dedicated product route even though account settings are not implemented yet.",
    futurePurpose:
      "Phase 2 will connect this page to user profile, auth session, and workspace-specific preferences.",
    title: "Profile",
    zone: "Product",
  },
  [routes.workspace]: {
    description:
      "Workspace settings and collaboration controls have a reserved home inside the product shell.",
    futurePurpose:
      "Later phases will add workspace configuration, member context, and dataset-scoped settings here.",
    title: "Workspace",
    zone: "Product",
  },
  [routes.adminHome]: {
    description:
      "The admin/operations zone is structurally separate from the product shell and intentionally visible from day one.",
    futurePurpose:
      "Later phases will surface operational health, access posture, and admin summaries without merging them into the user-facing app.",
    title: "Overview",
    zone: "Admin",
  },
  [routes.adminUsers]: {
    description:
      "User administration has a dedicated route boundary inside the admin zone.",
    futurePurpose:
      "Phase 2+ will add user lifecycle views, membership tools, and audit-safe administration here.",
    title: "Users",
    zone: "Admin",
  },
  [routes.adminInvites]: {
    description:
      "Invite operations are reserved in the admin zone, but real invite creation and acceptance are deferred.",
    futurePurpose:
      "Phase 2 will implement invite issuance, status tracking, and access provisioning from this surface.",
    title: "Invites",
    zone: "Admin",
  },
  [routes.adminPermissions]: {
    description:
      "Permissions scaffolding exists now so access-control work can land in the expected admin surface later.",
    futurePurpose:
      "Phase 2+ will add role assignment, dataset access rules, and operator tooling here.",
    title: "Permissions",
    zone: "Admin",
  },
  [routes.adminDatasets]: {
    description:
      "Admin dataset operations have a reserved route separate from the end-user browsing surface.",
    futurePurpose:
      "Later phases will manage dataset catalog settings, visibility, and publication controls from this page.",
    title: "Datasets",
    zone: "Admin",
  },
  [routes.adminApis]: {
    description:
      "Operational API configuration has a stable admin route even though integrations are not wired up yet.",
    futurePurpose:
      "Later phases will expose API registration, credential handling, and integration diagnostics here.",
    title: "APIs",
    zone: "Admin",
  },
  [routes.adminIngestionRuns]: {
    description:
      "Ingestion run monitoring is carved out as an admin-only operational surface in the route map.",
    futurePurpose:
      "Later phases will display run history, failures, and operator actions for data intake workflows.",
    title: "Ingestion Runs",
    zone: "Admin",
  },
  [routes.adminPipelineRuns]: {
    description:
      "Pipeline runs have a dedicated operations route so future processing diagnostics do not leak into the product shell.",
    futurePurpose:
      "Later phases will show orchestration state, diagnostics, and remediation actions for pipeline jobs.",
    title: "Pipeline Runs",
    zone: "Admin",
  },
  [routes.adminPublishing]: {
    description:
      "Publishing controls are scaffolded in the admin zone and ready for later workflow implementation.",
    futurePurpose:
      "Later phases will manage release workflows, dataset availability, and downstream publish status here.",
    title: "Publishing",
    zone: "Admin",
  },
} as const satisfies Record<AppRoute, PlaceholderDefinition>;
