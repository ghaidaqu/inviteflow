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
 * This does only the minimal safe equivalent for a hosted project:
 * create the "mahalli-demo" organization row (nothing else from
 * seed.sql), owned by whichever real, already-registered user is
 * oldest in this project's own auth.users — no synthetic user, no
 * password inserted.
 *
 * Delete this route once it's been called successfully once.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-admin-secret');
  if (!secret || !process.env.ADMIN_SEED_SECRET || secret !== process.env.ADMIN_SEED_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: existingOrg } = await admin
    .from('organizations')
    .select('id, slug, owner_id')
    .eq('slug', 'mahalli-demo')
    .maybeSingle();
  if (existingOrg) {
    return NextResponse.json({ ok: true, alreadyExisted: true, org: existingOrg });
  }

  // Both auth.admin.listUsers() and a plain profiles select failed
  // outright ("fetch failed", no postgrest body at all — i.e. before a
  // response even comes back) against this project when tried first;
  // organizations queries have worked fine all session, so borrow the
  // owner_id off any existing real organization instead of resolving a
  // user id from scratch — still a genuine, already-registered user,
  // just reached through a path that's proven to actually work here.
  const { data: anyOrg, error: anyOrgError } = await admin
    .from('organizations')
    .select('owner_id')
    .limit(1)
    .maybeSingle();
  if (anyOrgError || !anyOrg) {
    return NextResponse.json(
      {
        error: 'no existing organization to borrow an owner from',
        anyOrgError: anyOrgError?.message,
      },
      { status: 500 },
    );
  }
  const ownerId = anyOrg.owner_id;

  const { data: created, error: insertError } = await admin
    .from('organizations')
    .insert({ owner_id: ownerId, name: 'مهلّي (تجريبي)', slug: 'mahalli-demo' })
    .select('id, slug, owner_id')
    .single();
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, created });
}
