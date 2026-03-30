import type {
  DatasetVersionComparisonSummary,
  DatasetVersionLineageGraph,
} from "@/features/datasets/lineage-service";
import type { Enums } from "@/lib/supabase/database.types";

export const defaultInviteDurationDays = 7;

export type AdminActionStatus = "error" | "idle" | "success";
export type AppRole = Enums<"app_role">;
export type DatasetVisibility = Enums<"dataset_visibility">;
export type InviteStatus = Enums<"invite_status">;
export type WorkspaceMemberRole = Enums<"workspace_member_role">;

export interface AdminActionState<TData = null> {
  data: TData | null;
  message: string | null;
  status: AdminActionStatus;
}

export interface AdminWorkspaceSummary {
  id: string;
  name: string;
  role: WorkspaceMemberRole;
  slug: string;
}

export interface AdminUserRecord {
  appRole: AppRole;
  authMetadataAvailable: boolean;
  createdAt: string;
  displayName: string | null;
  email: string | null;
  lastSignInAt: string | null;
  memberships: AdminWorkspaceSummary[];
  updatedAt: string;
  userId: string;
}

export interface AdminInviteRecord {
  acceptedAt: string | null;
  createdAt: string;
  createdByDisplayName: string | null;
  createdByEmail: string | null;
  createdByUserId: string | null;
  email: string;
  expiresAt: string;
  id: string;
  inviteLink: string | null;
  status: InviteStatus;
}

export interface AdminDatasetRecord {
  activeVersionId: string | null;
  activeVersionIsDerived: boolean;
  activeVersionNumber: number | null;
  activeVersionSourceCount: number;
  createdAt: string;
  description: string | null;
  directUserGrantCount: number;
  id: string;
  isDefaultGlobal: boolean;
  name: string;
  ownerWorkspaceId: string | null;
  ownerWorkspaceName: string | null;
  sharedWorkspaceCount: number;
  slug: string;
  updatedAt: string;
  versionCount: number;
  visibility: DatasetVisibility;
  workspaceGrantCount: number;
}

export interface AdminDatasetVersionSourceRecord {
  datasetId: string;
  datasetName: string;
  datasetSlug: string;
  relationType: string;
  versionId: string;
  versionNumber: number | null;
}

export interface AdminDatasetVersionRecord {
  changeSummary: string | null;
  comparisonToActive: DatasetVersionComparisonSummary | null;
  createdAt: string;
  datasetId: string;
  id: string;
  isActive: boolean;
  isDerived: boolean;
  notes: string | null;
  publishedAt: string | null;
  publishedByDisplayName: string | null;
  publishedByEmail: string | null;
  rowCount: number;
  sourceCount: number;
  sourceRef: string | null;
  sources: AdminDatasetVersionSourceRecord[];
  versionNumber: number;
}

export interface AdminDatasetVersionEventRecord {
  actorDisplayName: string | null;
  actorEmail: string | null;
  createdAt: string;
  datasetId: string;
  eventType: string;
  id: string;
  metadataSummary: string[];
  previousVersionId: string | null;
  previousVersionNumber: number | null;
  versionId: string;
  versionNumber: number | null;
}

export interface AdminPublishingSelectedVersion {
  lineageGraph: DatasetVersionLineageGraph | null;
  pipelineContractNotes: string[];
  version: AdminDatasetVersionRecord;
}

export interface AdminDatasetUserGrant {
  createdAt: string;
  grantedByDisplayName: string | null;
  grantedByEmail: string | null;
  id: string;
  userDisplayName: string | null;
  userEmail: string | null;
  userId: string;
}

export interface AdminDatasetWorkspaceGrant {
  createdAt: string;
  grantedByDisplayName: string | null;
  grantedByEmail: string | null;
  id: string;
  isImplicit: boolean;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
}

export interface AdminDatasetAccessDetails {
  dataset: AdminDatasetRecord;
  groundedAccessRule: string;
  userGrants: AdminDatasetUserGrant[];
  workspaceGrants: AdminDatasetWorkspaceGrant[];
}

export interface AdminDashboardSummary {
  acceptedInviteCount: number;
  datasetCount: number;
  defaultGlobalActiveVersionNumber: number | null;
  defaultGlobalDatasetName: string | null;
  hasDefaultGlobalDataset: boolean;
  pendingInviteCount: number;
  privateDatasetCount: number;
  sharedDatasetCount: number;
  totalUserCount: number;
  workspaceDatasetCount: number;
}

export interface AdminOversightStatus {
  description: string;
  integrationNotes: string[];
  key: "apis" | "ingestion-runs" | "pipeline-runs";
  title: string;
}

export const createInitialAdminActionState = <
  TData = null,
>(): AdminActionState<TData> => {
  return {
    data: null,
    message: null,
    status: "idle",
  };
};

export const formatAdminDateTime = (value: string | null): string => {
  if (!value) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

export const formatAdminDate = (value: string | null): string => {
  if (!value) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
};

export const getEffectiveInviteStatus = (
  status: InviteStatus,
  expiresAt: string
): InviteStatus => {
  if (status !== "pending") {
    return status;
  }

  return new Date(expiresAt).getTime() < Date.now() ? "expired" : "pending";
};

export const inviteStatusLabel: Record<InviteStatus, string> = {
  accepted: "Accepted",
  expired: "Expired",
  pending: "Pending",
  revoked: "Revoked",
};

export const visibilityLabel: Record<DatasetVisibility, string> = {
  global: "Global",
  private: "Private",
  shared: "Shared",
  workspace: "Workspace",
};

export const appRoleLabel: Record<AppRole, string> = {
  admin: "Admin",
  user: "User",
};

export const getDatasetAccessRuleCopy = (
  visibility: DatasetVisibility
): string => {
  switch (visibility) {
    case "global":
      return "Current read logic allows every authenticated user to read this dataset.";
    case "private":
      return "Current read logic grants access through direct user-level dataset grants only.";
    case "shared":
      return "Current read logic allows the owner workspace and explicit workspace grants, while preserving any legacy shared user grants already recorded.";
    case "workspace":
      return "Current read logic allows members of the owner workspace only.";
    default:
      return "Current read logic follows the existing dataset visibility and grant model.";
  }
};

export const isPendingInviteActionable = (
  invite: Pick<AdminInviteRecord, "expiresAt" | "status">
): boolean => {
  return (
    getEffectiveInviteStatus(invite.status, invite.expiresAt) === "pending"
  );
};
