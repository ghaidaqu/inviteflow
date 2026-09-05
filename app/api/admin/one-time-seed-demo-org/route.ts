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
 * seed.sql), owned by whichever real, already-registered user already
 * owns some other organization — no synthetic user, no password.
 *
 * Delete this route once it's been called successfully once.
 */

// Every query here past the first one in a request has been failing
// outright with "TypeError: fetch failed" (no postgrest response body
// at all) against this project — the *first* outbound call in a fresh
// request always succeeds, every one after it doesn't. That's the
// signature of a Node/undici keep-alive connection-reuse race, not a
// real Supabase/network outage (the app's normal traffic — one query
// per request, mostly — never hits this). A bare retry works around it:
// the retry gets a new connection instead of the stale pooled one.
//
// supabase-js doesn't *throw* this — it catches the raw fetch failure
// internally and returns it as a normal `{ data: null, error }` result,
// so retrying only on a thrown exception (the usual pattern) would
// never actually retry here; this checks `.error` too.
async function withRetry<D, E>(
  fn: () => PromiseLike<{ data: D; error: E | null }>,
  attempts = 3,
): Promise<{ data: D; error: E | null }> {
  let last: { data: D; error: E | null } | undefined;
  for (let i = 0; i < attempts; i++) {
    last = await fn();
    if (!last.error) return last;
    await new Promise((resolve) => setTimeout(resolve, 300 * (i + 1)));
  }
  return last!;
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-admin-secret');
  if (!secret || !process.env.ADMIN_SEED_SECRET || secret !== process.env.ADMIN_SEED_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  const existingOrgResult = await withRetry(() =>
    admin
      .from('organizations')
      .select('id, slug, owner_id')
      .eq('slug', 'mahalli-demo')
      .maybeSingle(),
  );
  if (existingOrgResult.data) {
    return NextResponse.json({ ok: true, alreadyExisted: true, org: existingOrgResult.data });
  }

  const anyOrgResult = await withRetry(() =>
    admin.from('organizations').select('owner_id').limit(1).maybeSingle(),
  );
  if (anyOrgResult.error || !anyOrgResult.data) {
    return NextResponse.json(
      {
        error: 'no existing organization to borrow an owner from',
        anyOrgError: anyOrgResult.error?.message,
      },
      { status: 500 },
    );
  }
  const ownerId = anyOrgResult.data.owner_id;

  const createdResult = await withRetry(() =>
    admin
      .from('organizations')
      .insert({ owner_id: ownerId, name: 'مهلّي (تجريبي)', slug: 'mahalli-demo' })
      .select('id, slug, owner_id')
      .single(),
  );
  if (createdResult.error) {
    return NextResponse.json({ error: createdResult.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, created: createdResult.data });
}
