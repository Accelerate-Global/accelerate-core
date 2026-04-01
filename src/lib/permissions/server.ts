import "server-only";

import type { Enums } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AppRole = Enums<"app_role">;

const toErrorMessage = (message: string, cause?: string): string => {
  if (!cause) {
    return message;
  }

  return `${message}: ${cause}`;
};

export const getCurrentAppRole = async (): Promise<AppRole> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("current_app_role");

  if (error) {
    throw new Error(
      toErrorMessage("Failed to determine the current app role", error.message)
    );
  }

  return data ?? "user";
};

export const isCurrentUserAdmin = async (): Promise<boolean> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("is_admin");

  if (error) {
    throw new Error(
      toErrorMessage("Failed to determine admin access", error.message)
    );
  }

  return data ?? false;
};

export const canCurrentUserReadDataset = async (
  datasetId: string
): Promise<boolean> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("user_can_read_dataset", {
    target_dataset_id: datasetId,
  });

  if (error) {
    throw new Error(
      toErrorMessage("Failed to determine dataset access", error.message)
    );
  }

  return data ?? false;
};

export const canCurrentUserReadDatasetVersion = async (
  datasetVersionId: string
): Promise<boolean> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("user_can_read_dataset_version", {
    target_dataset_version_id: datasetVersionId,
  });

  if (error) {
    throw new Error(
      toErrorMessage(
        "Failed to determine dataset version access",
        error.message
      )
    );
  }

  return data ?? false;
};

export const requireCurrentUserToReadDataset = async (
  datasetId: string
): Promise<void> => {
  if (await canCurrentUserReadDataset(datasetId)) {
    return;
  }

  throw new Error("The current user cannot read this dataset.");
};

export const requireCurrentUserToReadDatasetVersion = async (
  datasetVersionId: string
): Promise<void> => {
  if (await canCurrentUserReadDatasetVersion(datasetVersionId)) {
    return;
  }

  throw new Error("The current user cannot read this dataset version.");
};
