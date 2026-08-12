import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { routing } from '@/i18n/routing';

// Logout used to be a React Server Action (see git history). Server
// actions are addressed by a per-build hash baked into the page bundle at
// load time — after any new deploy, a tab that was already open still
// holds the *old* hash, so its next "submit" 404s server-side with
// "Failed to find Server Action" and surfaces to the user as a raw
// "unexpected error" instead of logging them out. A route handler has no
// such hash: it's matched by its plain URL forever, so it keeps working
// across deploys even for a tab opened before this one shipped.
export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url);
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;
  const refererLocale = request.headers.get('referer')?.match(/\/(ar|en)(?:\/|$)/)?.[1];
  const candidate = localeCookie ?? refererLocale;
  const locale =
    candidate && routing.locales.includes(candidate as (typeof routing.locales)[number])
      ? candidate
      : routing.defaultLocale;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  return NextResponse.redirect(`${origin}/${locale}/login`, { status: 303 });
}
