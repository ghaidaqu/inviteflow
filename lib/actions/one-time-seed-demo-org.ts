'use server';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * TEMPORARY, one-time-use action — not linked from anywhere in the real
 * app, only from the equally-temporary page at
 * app/auth/seed-demo-org/page.tsx (living under /auth, not /[locale],
 * so next-intl's routing middleware — which would otherwise redirect it
 * to a locale-prefixed path that doesn't exist — leaves it alone, same
 * as /auth/logout already does). See that page for why this exists
 * (and why it's a Server Action rather than a Route Handler: the same
 * admin-client query that works fine here failed outright — "TypeError:
 * fetch failed" — every time it was tried as a plain Route Handler,
 * including as the sole/first query in an otherwise-empty request).
 *
 * Delete both this file and the page once this has succeeded once.
 */
export async function seedDemoOrgAction(secret: string): Promise<{ ok: boolean; message: string }> {
  if (!secret || !process.env.ADMIN_SEED_SECRET || secret !== process.env.ADMIN_SEED_SECRET) {
    return { ok: false, message: 'unauthorized' };
  }

  const admin = createAdminClient();

  // Mirrors lib/actions/try-demo.ts's own getOrCreateDemoEvent query
  // exactly (.single(), not .maybeSingle()) — that one is proven to
  // work against this project (its own error logging already confirmed
  // it gets a real response back, just correctly finding zero rows);
  // the .maybeSingle() version of this same query failed outright with
  // a raw "TypeError: fetch failed" every time it was tried, as both a
  // Route Handler and a Server Action.
  const { data: org } = await admin
    .from('organizations')
    .select('id, slug, owner_id')
    .eq('slug', 'mahalli-demo')
    .single();
  if (org) {
    return { ok: true, message: `already existed: ${JSON.stringify(org)}` };
  }

  const { data: anyOrg } = await admin.from('organizations').select('owner_id').limit(1).single();
  if (!anyOrg) {
    return { ok: false, message: 'no existing organization to borrow an owner from' };
  }

  const { data: created, error: insertError } = await admin
    .from('organizations')
    .insert({ owner_id: anyOrg.owner_id, name: 'مهلّي (تجريبي)', slug: 'mahalli-demo' })
    .select('id, slug, owner_id')
    .single();
  if (insertError) {
    return { ok: false, message: `insert failed: ${insertError.message}` };
  }

  return { ok: true, message: `created: ${JSON.stringify(created)}` };
}
