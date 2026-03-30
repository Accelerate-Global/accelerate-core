"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentUserAdmin } from "@/lib/auth/server";
import { routes } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Enums } from "@/lib/supabase/database.types";

const toErrorMessage = (message: string, cause?: string): string => {
  if (!cause) {
    return message;
  }

  return `${message}: ${cause}`;
};

const revalidateDatasetAdminPaths = (datasetId: string): void => {
  revalidatePath(routes.adminDatasets);
  revalidatePath(routes.adminPermissions);
  revalidatePath(routes.adminPublishing);
  revalidatePath(routes.adminHome);
  revalidatePath(routes.appHome);
  revalidatePath(routes.datasets);
  revalidatePath(routes.datasetDetail.replace("[datasetId]", datasetId));
  revalidatePath(routes.workspace);
};

const pruneDatasetAccessForVisibility = async (
  datasetId: string,
  nextVisibility: Enums<"dataset_visibility">
): Promise<void> => {
  const supabase = createAdminClient();

  if (nextVisibility === "shared") {
    return;
  }

  if (nextVisibility === "private") {
    const { error } = await supabase
      .from("dataset_access")
      .delete()
      .eq("dataset_id", datasetId)
      .filter("workspace_id", "not.is", "null");

    if (error) {
      throw new Error(
        toErrorMessage(
          "Failed to remove workspace grants for private visibility",
          error.message
        )
      );
    }

    return;
  }

  const { error } = await supabase
    .from("dataset_access")
    .delete()
    .eq("dataset_id", datasetId);

  if (error) {
    throw new Error(
      toErrorMessage("Failed to clear dataset access grants", error.message)
    );
  }
};

export const updateDatasetVisibilityAction = async (
  formData: FormData
): Promise<void> => {
  await requireCurrentUserAdmin();
  const datasetId = formData.get("datasetId");
  const nextVisibility = formData.get("nextVisibility");

  if (typeof datasetId !== "string" || !datasetId) {
    throw new Error("A dataset id is required.");
  }

  if (
    nextVisibility !== "global" &&
    nextVisibility !== "private" &&
    nextVisibility !== "shared" &&
    nextVisibility !== "workspace"
  ) {
    throw new Error("A valid visibility is required.");
  }

  const supabase = createAdminClient();
  const { data: dataset, error: datasetError } = await supabase
    .from("datasets")
    .select("id, visibility, owner_workspace_id, is_default_global")
    .eq("id", datasetId)
    .maybeSingle();

  if (datasetError) {
    throw new Error(
      toErrorMessage("Failed to load the dataset", datasetError.message)
    );
  }

  if (!dataset) {
    throw new Error("The selected dataset could not be found.");
  }

  if (
    (nextVisibility === "shared" || nextVisibility === "workspace") &&
    !dataset.owner_workspace_id
  ) {
    throw new Error(
      "This dataset needs an owner workspace before it can use workspace-based visibility."
    );
  }

  const nextDatasetShape: {
    is_default_global?: boolean;
    visibility: Enums<"dataset_visibility">;
  } = {
    visibility: nextVisibility,
  };

  if (nextVisibility !== "global" && dataset.is_default_global) {
    nextDatasetShape.is_default_global = false;
  }

  const { error: updateError } = await supabase
    .from("datasets")
    .update(nextDatasetShape)
    .eq("id", datasetId);

  if (updateError) {
    throw new Error(
      toErrorMessage("Failed to update dataset visibility", updateError.message)
    );
  }

  await pruneDatasetAccessForVisibility(datasetId, nextVisibility);

  revalidateDatasetAdminPaths(datasetId);
};

export const setDefaultGlobalDatasetAction = async (
  formData: FormData
): Promise<void> => {
  await requireCurrentUserAdmin();
  const datasetId = formData.get("datasetId");

  if (typeof datasetId !== "string" || !datasetId) {
    throw new Error("A dataset id is required.");
  }

  const supabase = createAdminClient();
  const { data: dataset, error: datasetError } = await supabase
    .from("datasets")
    .select("id, visibility")
    .eq("id", datasetId)
    .maybeSingle();

  if (datasetError) {
    throw new Error(
      toErrorMessage("Failed to load the dataset", datasetError.message)
    );
  }

  if (!dataset) {
    throw new Error("The selected dataset could not be found.");
  }

  if (dataset.visibility !== "global") {
    throw new Error(
      "Only global datasets can become the default global dataset."
    );
  }

  const { error: clearError } = await supabase
    .from("datasets")
    .update({
      is_default_global: false,
    })
    .eq("is_default_global", true);

  if (clearError) {
    throw new Error(
      toErrorMessage(
        "Failed to clear the current default global dataset",
        clearError.message
      )
    );
  }

  const { error: updateError } = await supabase
    .from("datasets")
    .update({
      is_default_global: true,
    })
    .eq("id", datasetId);

  if (updateError) {
    throw new Error(
      toErrorMessage(
        "Failed to set the default global dataset",
        updateError.message
      )
    );
  }

  revalidateDatasetAdminPaths(datasetId);
};

export const activateDatasetVersionAction = async (
  formData: FormData
): Promise<void> => {
  await requireCurrentUserAdmin();
  const datasetId = formData.get("datasetId");
  const datasetVersionId = formData.get("datasetVersionId");

  if (typeof datasetId !== "string" || !datasetId) {
    throw new Error("A dataset id is required.");
  }

  if (typeof datasetVersionId !== "string" || !datasetVersionId) {
    throw new Error("A dataset version id is required.");
  }

  const supabase = createAdminClient();
  const { data: datasetVersion, error: versionError } = await supabase
    .from("dataset_versions")
    .select("id, dataset_id")
    .eq("id", datasetVersionId)
    .maybeSingle();

  if (versionError) {
    throw new Error(
      toErrorMessage("Failed to load the dataset version", versionError.message)
    );
  }

  if (!datasetVersion || datasetVersion.dataset_id !== datasetId) {
    throw new Error(
      "The selected dataset version does not belong to this dataset."
    );
  }

  const { error: updateError } = await supabase
    .from("datasets")
    .update({
      active_version_id: datasetVersionId,
    })
    .eq("id", datasetId);

  if (updateError) {
    throw new Error(
      toErrorMessage(
        "Failed to activate the dataset version",
        updateError.message
      )
    );
  }

  revalidateDatasetAdminPaths(datasetId);
};
