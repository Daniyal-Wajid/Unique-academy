import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv, getSupabaseServiceRoleKey } from "@/lib/supabase/env";
import type { Database } from "@/lib/types/database";

/**
 * Service-role client. Server-only. Never import this into client components.
 */
export function createAdminClient() {
  const env = getSupabasePublicEnv();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!env || !serviceRoleKey) {
    throw new Error(
      "Supabase service role is not configured. Add SUPABASE_SERVICE_ROLE_KEY to .env.local.",
    );
  }

  return createClient<Database>(env.url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
