import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { broadcastEventResults } from '@/lib/services/results.service';

/**
 * Called periodically (see the pg_cron job set up alongside
 * 20260908000002_auto_broadcast_results.sql — not itself a migration,
 * since scheduling it means embedding this route's secret, which has no
 * business in a file committed to git) to send the final RSVP results to
 * every guest of an event whose deadline just passed, for organizers who
 * opted into `auto_broadcast_results`. Safe to call as often as needed:
 * `results_broadcast_at is null` is what actually selects an event, so a
 * duplicate or overlapping call just finds nothing left to do.
 *
 * Auth is a single shared secret (CRON_SECRET) rather than a signed
 * request, matching the trust model — the only caller is our own
 * database, not a third party whose payload needs verifying.
 */
function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const provided = req.headers.get('x-cron-secret') ?? '';
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);
  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: events, error } = await admin
    .from('events')
    .select('id, name, slug, primary_locale, event_settings!inner(auto_broadcast_results)')
    .eq('status', 'published')
    .eq('event_settings.auto_broadcast_results', true)
    .is('results_broadcast_at', null)
    .is('deleted_at', null)
    .not('rsvp_deadline', 'is', null)
    .lt('rsvp_deadline', new Date().toISOString());

  if (error) {
    console.error('[cron broadcast-results] query failed', error);
    return NextResponse.json({ error: 'query_failed' }, { status: 500 });
  }

  const results: { eventId: string; sentCount: number; totalGuests: number }[] = [];

  for (const event of events) {
    // Stamp BEFORE sending, conditional on it still being null. The stamp
    // used to happen after the whole guest loop, so two concurrent runs
    // both saw null and both broadcast to the full list. This claims the
    // event atomically: whoever sets the timestamp first is the only one
    // that sends. The cost of the ordering is that a mid-broadcast crash
    // leaves the event stamped and some guests unmessaged — the right way
    // round, since the alternative is messaging everyone twice.
    const { data: claimed } = await admin
      .from('events')
      .update({ results_broadcast_at: new Date().toISOString() })
      .eq('id', event.id)
      .is('results_broadcast_at', null)
      .select('id')
      .maybeSingle();
    if (!claimed) continue;

    try {
      const locale = event.primary_locale === 'en' ? 'en' : 'ar';
      const { sentCount, totalGuests } = await broadcastEventResults(admin, event, locale);
      results.push({ eventId: event.id, sentCount, totalGuests });
    } catch (broadcastError) {
      // One event's failure (a malformed question, a send error) shouldn't
      // block the rest. Note the event stays stamped, so the next run will
      // not retry it — deliberate: a retry would re-message everyone the
      // failed run already reached.
      console.error('[cron broadcast-results] event failed', event.id, broadcastError);
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
