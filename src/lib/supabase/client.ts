import { createBrowserClient } from "@supabase/ssr";

import { getClientEnv } from "@/lib/env";

export const createBrowserSupabaseClient = () => {
  const env = getClientEnv();

  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

export const createClient = createBrowserSupabaseClient;
