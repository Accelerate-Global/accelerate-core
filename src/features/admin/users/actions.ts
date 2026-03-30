"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentUserAdmin } from "@/lib/auth/server";
import { routes } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/admin";

const toErrorMessage = (message: string, cause?: string): string => {
  if (!cause) {
    return message;
  }

  return `${message}: ${cause}`;
};

export const updateUserRoleAction = async (
  formData: FormData
): Promise<void> => {
  const actingUser = await requireCurrentUserAdmin();
  const userId = formData.get("userId");
  const nextRole = formData.get("nextRole");

  if (typeof userId !== "string" || !userId) {
    throw new Error("A target user is required.");
  }

  if (nextRole !== "admin" && nextRole !== "user") {
    throw new Error("A valid target role is required.");
  }

  const supabase = createAdminClient();
  const { data: targetProfile, error: profileError } = await supabase
    .from("profiles")
    .select("user_id, app_role")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(
      toErrorMessage("Failed to load the target profile", profileError.message)
    );
  }

  if (!targetProfile) {
    throw new Error("The selected user profile could not be found.");
  }

  if (targetProfile.app_role === nextRole) {
    return;
  }

  if (nextRole === "user" && userId === actingUser.id) {
    throw new Error("You cannot remove your own admin access.");
  }

  if (nextRole === "user") {
    const { count, error: countError } = await supabase
      .from("profiles")
      .select("user_id", { count: "exact", head: true })
      .eq("app_role", "admin");

    if (countError) {
      throw new Error(
        toErrorMessage("Failed to validate admin coverage", countError.message)
      );
    }

    if ((count ?? 0) <= 1) {
      throw new Error("At least one admin account must remain assigned.");
    }
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      app_role: nextRole,
    })
    .eq("user_id", userId);

  if (updateError) {
    throw new Error(
      toErrorMessage("Failed to update the app role", updateError.message)
    );
  }

  revalidatePath(routes.adminUsers);
  revalidatePath(routes.adminHome);
};
