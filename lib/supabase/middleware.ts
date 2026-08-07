import { createServerClient } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/supabase';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import type { User } from '@supabase/supabase-js';

/**
 * Refreshes the Supabase auth session cookies on every request and returns
 * the current user (or null). Route-level protection (e.g. redirecting
 * unauthenticated requests away from /dashboard) is layered on top of this
 * in the root middleware once auth pages exist.
 */
export async function updateSession(request: NextRequest, response: NextResponse) {
  // Before a real Supabase project is connected (see .env.example), treat
  // every request as unauthenticated instead of crashing the whole app.
  if (!isSupabaseConfigured()) {
    return { response, user: null as User | null };
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
