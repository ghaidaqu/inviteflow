import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

/**
 * Anonymous, cookie-free Supabase client for public reads on pages that
 * should be cacheable (ISR) — e.g. the homepage's public ticketed-events
 * list. Still uses the anon key, so RLS is enforced exactly like the
 * cookie-aware client in `server.ts`; the only difference is this one never
 * calls `cookies()`, which is what forces a route into fully-dynamic,
 * uncached rendering on every request.
 *
 * Do NOT use this for anything session-aware (login state, an organizer's
 * own data) — for that, use `createClient()` in `server.ts`.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
