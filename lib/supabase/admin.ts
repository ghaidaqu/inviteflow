import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

/**
 * Service-role client that bypasses RLS entirely. `server-only` guarantees
 * this file (and therefore the service role key) can never be pulled into a
 * browser bundle. Use sparingly — almost everything should go through the
 * request-scoped client in `server.ts` or a SECURITY DEFINER RPC instead.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
