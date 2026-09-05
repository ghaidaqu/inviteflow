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

  // profiles.id mirrors auth.users.id 1:1 (a row is created there per
  // signup) — reading it via the regular postgrest path instead of the
  // GoTrue admin API (auth.admin.listUsers()), which failed outright
  // ("fetch failed") when tried first; this way stays on the same
  // REST path every other admin query in this codebase already uses
  // successfully.
  const { data: earliestProfile, error: profileError } = await admin
    .from('profiles')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (profileError || !earliestProfile) {
    return NextResponse.json(
      { error: 'no existing user to own the demo org', profileError: profileError?.message },
      { status: 500 },
    );
  }
  const ownerId = earliestProfile.id;

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
