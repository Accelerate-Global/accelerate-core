import "server-only";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { createDatasetApiError } from "@/features/datasets/errors";
import { isCurrentUserAdmin } from "@/lib/permissions/server";
import { routes } from "@/lib/routes";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export class AdminAccessError extends Error {
  constructor(message = "You do not have admin access.") {
    super(message);
    this.name = "AdminAccessError";
  }
}

export const requireAuthenticatedUser = async (): Promise<User> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw createDatasetApiError(
      401,
      "UNAUTHENTICATED",
      "You must be authenticated to access datasets."
    );
  }

  if (!data.user) {
    throw createDatasetApiError(
      401,
      "UNAUTHENTICATED",
      "You must be authenticated to access datasets."
    );
  }

  return data.user;
};

export const requireAuthenticatedUserOrRedirect = async (): Promise<User> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect(routes.login);
  }

  return data.user;
};

export const requireCurrentUserAdmin = async (): Promise<User> => {
  const user = await requireAuthenticatedUser();

  if (!(await isCurrentUserAdmin())) {
    throw new AdminAccessError();
  }

  return user;
};

export const requireCurrentUserAdminOrRedirect = async (): Promise<User> => {
  const user = await requireAuthenticatedUserOrRedirect();

  if (!(await isCurrentUserAdmin())) {
    redirect(routes.appHome);
  }

  return user;
};
