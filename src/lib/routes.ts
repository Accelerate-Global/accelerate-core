export const routes = {
  root: "/",
  login: "/login",
  invite: "/invite/[token]",
  authCallback: "/auth/callback",
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
