import type { Enums, Tables } from "@/lib/supabase/database.types";

export const workspaceMemberRole = {
  admin: "admin",
  member: "member",
  owner: "owner",
} as const;

type WorkspaceMemberRecord = Tables<"workspace_members">;
type WorkspaceRecord = Tables<"workspaces">;

export type WorkspaceMemberRole = Enums<"workspace_member_role">;

export interface Workspace {
  createdAt: string;
  description: string | null;
  id: string;
  name: string;
  slug: string;
  updatedAt: string;
}

export interface WorkspaceMembership {
  createdAt: string;
  role: WorkspaceMemberRole;
  userId: string;
  workspaceId: string;
}

export const normalizeWorkspace = (workspace: WorkspaceRecord): Workspace => {
  return {
    createdAt: workspace.created_at,
    description: workspace.description,
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    updatedAt: workspace.updated_at,
  };
};

export const normalizeWorkspaceMembership = (
  membership: WorkspaceMemberRecord
): WorkspaceMembership => {
  return {
    createdAt: membership.created_at,
    role: membership.role,
    userId: membership.user_id,
    workspaceId: membership.workspace_id,
  };
};
