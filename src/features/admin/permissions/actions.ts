"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentUserAdmin } from "@/lib/auth/server";
import { routes } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";

const toErrorMessage = (message: string, cause?: string): string => {
  if (!cause) {
    return message;
  }

  return `${message}: ${cause}`;
};

const loadDatasetForPermissionAction = async (
  datasetId: string
): Promise<Tables<"datasets">> => {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("datasets")
    .select("id, visibility, owner_workspace_id")
    .eq("id", datasetId)
    .maybeSingle();

  if (error) {
    throw new Error(
      toErrorMessage("Failed to load the dataset", error.message)
    );
  }

  if (!data) {
    throw new Error("The selected dataset could not be found.");
  }

  return data as Tables<"datasets">;
};

const revalidatePermissionsPaths = (datasetId: string): void => {
  revalidatePath(getPermissionsDatasetPath(datasetId));
  revalidatePath(routes.adminPermissions);
  revalidatePath(routes.adminDatasets);
  revalidatePath(routes.adminPublishing);
  revalidatePath(routes.appHome);
  revalidatePath(routes.datasets);
  revalidatePath(routes.datasetDetail.replace("[datasetId]", datasetId));
  revalidatePath(routes.workspace);
};

const getPermissionsDatasetPath = (datasetId: string): string => {
  return `${routes.adminPermissions}?datasetId=${datasetId}`;
};

export const grantUserDatasetAccessAction = async (
  formData: FormData
): Promise<void> => {
  const actingUser = await requireCurrentUserAdmin();
  const datasetId = formData.get("datasetId");
  const userId = formData.get("userId");

  if (typeof datasetId !== "string" || !datasetId) {
    throw new Error("A dataset id is required.");
  }

  if (typeof userId !== "string" || !userId) {
    throw new Error("A user id is required.");
  }

  const dataset = await loadDatasetForPermissionAction(datasetId);

  if (dataset.visibility !== "private") {
    throw new Error(
      "Phase 7 only allows new direct user grants for private datasets."
    );
  }

  const supabase = createAdminClient();
  const { data: existingGrant, error: existingError } = await supabase
    .from("dataset_access")
    .select("id")
    .eq("dataset_id", datasetId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) {
    throw new Error(
      toErrorMessage(
        "Failed to inspect existing user grants",
        existingError.message
      )
    );
  }

  if (!existingGrant) {
    const { error: insertError } = await supabase
      .from("dataset_access")
      .insert({
        dataset_id: datasetId,
        granted_by: actingUser.id,
        user_id: userId,
      });

    if (insertError) {
      throw new Error(
        toErrorMessage("Failed to grant dataset access", insertError.message)
      );
    }
  }

  revalidatePermissionsPaths(datasetId);
  redirect(getPermissionsDatasetPath(datasetId));
};

export const revokeUserDatasetAccessAction = async (
  formData: FormData
): Promise<void> => {
  await requireCurrentUserAdmin();
  const accessId = formData.get("accessId");
  const datasetId = formData.get("datasetId");

  if (typeof accessId !== "string" || !accessId) {
    throw new Error("A dataset access id is required.");
  }

  if (typeof datasetId !== "string" || !datasetId) {
    throw new Error("A dataset id is required.");
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("dataset_access")
    .delete()
    .eq("id", accessId);

  if (error) {
    throw new Error(
      toErrorMessage("Failed to revoke user dataset access", error.message)
    );
  }

  revalidatePermissionsPaths(datasetId);
  redirect(getPermissionsDatasetPath(datasetId));
};

export const grantWorkspaceDatasetAccessAction = async (
  formData: FormData
): Promise<void> => {
  const actingUser = await requireCurrentUserAdmin();
  const datasetId = formData.get("datasetId");
  const workspaceId = formData.get("workspaceId");

  if (typeof datasetId !== "string" || !datasetId) {
    throw new Error("A dataset id is required.");
  }

  if (typeof workspaceId !== "string" || !workspaceId) {
    throw new Error("A workspace id is required.");
  }

  const dataset = await loadDatasetForPermissionAction(datasetId);

  if (dataset.visibility !== "shared") {
    throw new Error(
      "The current access model only uses workspace grants for shared datasets."
    );
  }

  if (dataset.owner_workspace_id === workspaceId) {
    throw new Error(
      "The owner workspace already has access through dataset ownership."
    );
  }

  const supabase = createAdminClient();
  const { data: existingGrant, error: existingError } = await supabase
    .from("dataset_access")
    .select("id")
    .eq("dataset_id", datasetId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (existingError) {
    throw new Error(
      toErrorMessage(
        "Failed to inspect existing workspace grants",
        existingError.message
      )
    );
  }

  if (!existingGrant) {
    const { error: insertError } = await supabase
      .from("dataset_access")
      .insert({
        dataset_id: datasetId,
        granted_by: actingUser.id,
        workspace_id: workspaceId,
      });

    if (insertError) {
      throw new Error(
        toErrorMessage(
          "Failed to grant workspace dataset access",
          insertError.message
        )
      );
    }
  }

  revalidatePermissionsPaths(datasetId);
  redirect(getPermissionsDatasetPath(datasetId));
};

export const revokeWorkspaceDatasetAccessAction = async (
  formData: FormData
): Promise<void> => {
  await requireCurrentUserAdmin();
  const accessId = formData.get("accessId");
  const datasetId = formData.get("datasetId");

  if (typeof accessId !== "string" || !accessId) {
    throw new Error("A dataset access id is required.");
  }

  if (typeof datasetId !== "string" || !datasetId) {
    throw new Error("A dataset id is required.");
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("dataset_access")
    .delete()
    .eq("id", accessId);

  if (error) {
    throw new Error(
      toErrorMessage("Failed to revoke workspace dataset access", error.message)
    );
  }

  revalidatePermissionsPaths(datasetId);
  redirect(getPermissionsDatasetPath(datasetId));
};
