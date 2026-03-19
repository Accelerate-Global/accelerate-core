import "server-only";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";

import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  app_role: "user" | "admin";
  created_at: string;
  updated_at: string;
};

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return data.user ?? null;
});

export const requireUser = async (): Promise<User> => {
  const user = await getCurrentUser();

  if (!user) {
    redirect(routes.login);
  }

  return user;
};

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    return null;
  }

  return data;
});

export const requireAdmin = async (): Promise<Profile | null> => {
  const profile = await getCurrentProfile();

  if (!profile || profile.app_role !== "admin") {
    return null;
  }

  return profile;
};
