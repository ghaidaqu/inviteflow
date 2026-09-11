import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '@/lib/supabase/env';

/**
 * Liveness for an uptime monitor, and for Railway's own healthcheck.
 *
 * "The container is up" is not the same as "the site works": the app can
 * answer HTTP perfectly while the database behind it is unreachable, and
 * every page a guest opens is a 500. So this reaches Postgres too, and
 * reports 503 when it cannot — which is the state worth being woken for.
 *
 * Deliberately unauthenticated, and deliberately says nothing else. No
 * version, no environment, no error text: a monitor needs a number, and
 * anything more is free reconnaissance. The database check is a HEAD
 * count against a single row, so hammering this endpoint costs about as
 * much as a ping and it needs no rate limit of its own.
 *
 * Built with the anon key on purpose. The service role would answer even
 * if RLS were broken; anon exercises the same path a guest's request
 * takes, so a misconfiguration that would break the public site shows up
 * here rather than passing.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );
    const { error } = await supabase
      .from('events')
      .select('id', { head: true, count: 'exact' })
      .limit(1);

    if (error) {
      console.error('[health] database unreachable', error);
      return NextResponse.json({ ok: false }, { status: 503 });
    }
  } catch (error) {
    console.error('[health] check threw', error);
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  return NextResponse.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
}
