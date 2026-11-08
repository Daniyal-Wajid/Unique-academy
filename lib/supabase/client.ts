import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import type { Database } from "@/lib/types/database";

export function createClient() {
  const env = getSupabasePublicEnv();
  if (!env) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
    );
  }

  return createBrowserClient<Database>(env.url, env.anonKey);
}
