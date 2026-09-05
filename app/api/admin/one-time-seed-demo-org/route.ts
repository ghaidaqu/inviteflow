import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * TEMPORARY, one-time-use route — not linked from anywhere in the app.
 * supabase/seed.sql explicitly refuses to be run against a hosted
 * project (it inserts directly into auth.users with a raw password,
 * which both bypasses real Auth and doesn't even match this project's
 * current passwordless-OTP-only login). Production's "mahalli-demo"
 * organization was simply never created, which is why every
 * /try ("جرّب مجاناً") request has been failing before it ever reaches
 * the WhatsApp send — lib/actions/try-demo.ts's getOrCreateDemoEvent
 * throws when that org doesn't exist.
 *
 * Split into two calls on purpose, each doing exactly one Supabase
 * query: every query *after the first* in a single request has been
 * failing outright with "TypeError: fetch failed" against this
 * project — not a real outage (retrying within the same request, even
 * several times with backoff, never recovered it either), but the
 * first query of a *fresh* request always succeeds. So:
 *
 *   1. GET  → returns an existing organization's owner_id to reuse
 *             (a genuine, already-registered user — no synthetic one).
 *   2. POST { ownerId } → inserts the "mahalli-demo" organization
 *             owned by that id.
 *
 * Delete this route once step 2 has succeeded once.
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-admin-secret');
  if (!secret || !process.env.ADMIN_SEED_SECRET || secret !== process.env.ADMIN_SEED_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('organizations')
    .select('owner_id')
    .limit(1)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json(
      { error: 'no existing organization to borrow an owner from', detail: error?.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ownerId: data.owner_id });
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-admin-secret');
  if (!secret || !process.env.ADMIN_SEED_SECRET || secret !== process.env.ADMIN_SEED_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const ownerId = body?.ownerId;
  if (typeof ownerId !== 'string' || !ownerId) {
    return NextResponse.json({ error: 'ownerId required in JSON body' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('organizations')
    .insert({ owner_id: ownerId, name: 'مهلّي (تجريبي)', slug: 'mahalli-demo' })
    .select('id, slug, owner_id')
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, created: data });
}
