import "server-only";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { createDatasetApiError } from "@/features/datasets/errors";
import { routes } from "@/lib/routes";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
