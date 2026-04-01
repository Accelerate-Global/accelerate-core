import "server-only";

import type { User } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";

const profileSelect =
  "user_id, app_role, display_name, avatar_url, created_at, updated_at";

const workspaceSelect = "id, slug, name, description, created_at, updated_at";

const workspaceMembershipSelect = "workspace_id, user_id, role, created_at";

const inviteSelect =
  "id, email, status, expires_at, accepted_at, created_by, created_at, updated_at";

const datasetSelect =
  "id, slug, name, description, visibility, is_default_global, owner_workspace_id, active_version_id, metadata, created_at, updated_at";

const datasetVersionSelect =
  "id, dataset_id, version_number, column_definitions, row_count, source_ref, " +
  "metadata, notes, change_summary, published_at, published_by, created_at";

const datasetVersionSourceSelect =
  "id, dataset_version_id, source_dataset_version_id, relation_type, created_at";

const datasetVersionEventSelect =
  "id, dataset_id, dataset_version_id, previous_dataset_version_id, " +
  "event_type, actor_user_id, metadata, created_at";

const datasetAccessSelect =
  "id, dataset_id, user_id, workspace_id, granted_by, created_at";

const toErrorMessage = (message: string, cause?: string): string => {
  if (!cause) {
    return message;
  }

  return `${message}: ${cause}`;
};

export interface AuthUsersResult {
  isAvailable: boolean;
  usersById: Map<string, User>;
}

export const listAdminProfiles = async (): Promise<Tables<"profiles">[]> => {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(profileSelect)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(
      toErrorMessage("Failed to load admin profiles", error.message)
    );
  }

  return (data ?? []) as Tables<"profiles">[];
};

export const listAdminWorkspaces = async (): Promise<
  Tables<"workspaces">[]
> => {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select(workspaceSelect)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(
      toErrorMessage("Failed to load admin workspaces", error.message)
    );
  }

  return (data ?? []) as Tables<"workspaces">[];
};

export const listAdminWorkspaceMemberships = async (): Promise<
  Tables<"workspace_members">[]
> => {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select(workspaceMembershipSelect)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(
      toErrorMessage("Failed to load workspace memberships", error.message)
    );
  }

  return (data ?? []) as Tables<"workspace_members">[];
};

export const listAdminInvites = async (): Promise<Tables<"invites">[]> => {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("invites")
    .select(inviteSelect)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(toErrorMessage("Failed to load invites", error.message));
  }

  return (data ?? []) as Tables<"invites">[];
};

export const listAdminDatasets = async (): Promise<Tables<"datasets">[]> => {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("datasets")
    .select(datasetSelect)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(toErrorMessage("Failed to load datasets", error.message));
  }

  return (data ?? []) as Tables<"datasets">[];
};

export const listAdminDatasetVersions = async (): Promise<
  Tables<"dataset_versions">[]
> => {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("dataset_versions")
    .select(datasetVersionSelect)
    .order("version_number", { ascending: false });

  if (error) {
    throw new Error(
      toErrorMessage("Failed to load dataset versions", error.message)
    );
  }

  return (data ?? []) as unknown as Tables<"dataset_versions">[];
};

export const listAdminDatasetAccess = async (): Promise<
  Tables<"dataset_access">[]
> => {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("dataset_access")
    .select(datasetAccessSelect)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      toErrorMessage("Failed to load dataset access records", error.message)
    );
  }

  return (data ?? []) as Tables<"dataset_access">[];
};

export const listAdminDatasetVersionSources = async (): Promise<
  Tables<"dataset_version_sources">[]
> => {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("dataset_version_sources")
    .select(datasetVersionSourceSelect)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(
      toErrorMessage("Failed to load dataset version sources", error.message)
    );
  }

  return (data ?? []) as Tables<"dataset_version_sources">[];
};

export const listAdminDatasetVersionEvents = async (): Promise<
  Tables<"dataset_version_events">[]
> => {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("dataset_version_events")
    .select(datasetVersionEventSelect)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      toErrorMessage("Failed to load dataset version events", error.message)
    );
  }

  return (data ?? []) as unknown as Tables<"dataset_version_events">[];
};

export const listAdminAuthUsers = async (): Promise<AuthUsersResult> => {
  const supabase = createAdminClient();
  const usersById = new Map<string, User>();
  const perPage = 200;
  let page = 1;

  while (page <= 5) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      return {
        isAvailable: false,
        usersById,
      };
    }

    for (const user of data.users) {
      usersById.set(user.id, user);
    }

    if (!data.nextPage) {
      break;
    }

    page = data.nextPage;
  }

  return {
    isAvailable: true,
    usersById,
  };
};
