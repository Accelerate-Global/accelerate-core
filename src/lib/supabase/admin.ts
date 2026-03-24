import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getServerEnv, getSupabaseServiceRoleKey } from "@/lib/env";

export const createServiceRoleSupabaseClient = () => {
  const env = getServerEnv();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export const createAdminClient = createServiceRoleSupabaseClient;
