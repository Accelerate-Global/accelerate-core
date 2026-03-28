import "server-only";

import {
  normalizeWorkspace,
  normalizeWorkspaceMembership,
  type Workspace,
  type WorkspaceMembership,
} from "@/features/workspaces/types";
import type { Tables } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const workspaceSelect = "id, slug, name, description, created_at, updated_at";

const membershipSelect = "workspace_id, user_id, role, created_at";

const toErrorMessage = (message: string, cause?: string): string => {
  if (!cause) {
    return message;
  }

  return `${message}: ${cause}`;
};

export const listReadableWorkspaces = async (): Promise<Workspace[]> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select(workspaceSelect)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(toErrorMessage("Failed to list workspaces", error.message));
  }

  return (data as unknown as Tables<"workspaces">[]).map(normalizeWorkspace);
};

export const listCurrentUserWorkspaceMemberships = async (): Promise<
  WorkspaceMembership[]
> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select(membershipSelect)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(
      toErrorMessage("Failed to list workspace memberships", error.message)
    );
  }

  return (data as unknown as Tables<"workspace_members">[]).map(
    normalizeWorkspaceMembership
  );
};
