import "server-only";

import {
  listReadableDatasetContexts,
  mapReadableDatasetContextToSummary,
} from "@/features/datasets/context-service";
import type { DatasetSummary } from "@/features/datasets/query-contract";
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

const normalizeSearchParam = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }

  return value?.trim() ?? "";
};

export interface WorkspaceMembershipSummary {
  role: WorkspaceMembership["role"] | null;
  workspace: Workspace;
}

export interface WorkspacePageData {
  datasets: DatasetSummary[];
  memberships: WorkspaceMembershipSummary[];
  selectedWorkspaceId: string | null;
  selectedWorkspaceName: string | null;
}

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

export const loadWorkspacePage = async (
  searchParams: Record<string, string | string[] | undefined>
): Promise<WorkspacePageData> => {
  const [workspaces, memberships, datasetContexts] = await Promise.all([
    listReadableWorkspaces(),
    listCurrentUserWorkspaceMemberships(),
    listReadableDatasetContexts(),
  ]);
  const workspaceById = new Map(
    workspaces.map((workspace) => [workspace.id, workspace] as const)
  );
  const membershipByWorkspaceId = new Map(
    memberships.map(
      (membership) => [membership.workspaceId, membership] as const
    )
  );
  const workspaceOptions =
    workspaces.length > 0
      ? workspaces
      : memberships
          .map((membership) => membership.workspaceId)
          .map((workspaceId) => workspaceById.get(workspaceId))
          .filter((workspace): workspace is Workspace => Boolean(workspace));
  const membershipsSummary = workspaceOptions.map((workspace) => {
    return {
      role: membershipByWorkspaceId.get(workspace.id)?.role ?? null,
      workspace,
    } satisfies WorkspaceMembershipSummary;
  });
  const selectedWorkspaceIdValue = normalizeSearchParam(
    searchParams.workspaceId
  );
  const selectedWorkspaceId =
    selectedWorkspaceIdValue &&
    workspaceOptions.some(
      (workspace) => workspace.id === selectedWorkspaceIdValue
    )
      ? selectedWorkspaceIdValue
      : null;
  const availableWorkspaceIds = new Set(
    workspaceOptions.map((workspace) => workspace.id)
  );
  const datasets = datasetContexts
    .filter((datasetContext) => {
      if (
        datasetContext.dataset.visibility !== "workspace" &&
        datasetContext.dataset.visibility !== "shared"
      ) {
        return false;
      }

      if (selectedWorkspaceId) {
        return (
          datasetContext.dataset.ownerWorkspaceId === selectedWorkspaceId ||
          datasetContext.sharedWorkspaceIds.includes(selectedWorkspaceId)
        );
      }

      if (availableWorkspaceIds.size === 0) {
        return false;
      }

      return (
        (datasetContext.dataset.ownerWorkspaceId !== null &&
          availableWorkspaceIds.has(datasetContext.dataset.ownerWorkspaceId)) ||
        datasetContext.sharedWorkspaceIds.some((workspaceId) =>
          availableWorkspaceIds.has(workspaceId)
        )
      );
    })
    .map(mapReadableDatasetContextToSummary)
    .sort((leftDataset, rightDataset) => {
      return leftDataset.name.localeCompare(rightDataset.name);
    });

  return {
    datasets,
    memberships: membershipsSummary,
    selectedWorkspaceId,
    selectedWorkspaceName: selectedWorkspaceId
      ? (workspaceById.get(selectedWorkspaceId)?.name ?? null)
      : null,
  };
};
