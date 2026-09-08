import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/supabase';

type Client = SupabaseClient<Database>;

/**
 * How long after an event a door-staff link keeps working. The door
 * doesn't close the second the event's listed end time passes — people
 * arrive late, and an organizer who set only a start time still needs the
 * scanner working all evening — so the link outlives the event by a day
 * and then stops on its own.
 */
const STAFF_LINK_GRACE_MS = 24 * 60 * 60 * 1000;

/**
 * Resolves the per-event door-staff secret (events.check_in_token, see
 * 20260908000004) to the event it opens. Uses the service role because
 * the caller is by definition unauthenticated — the whole point of the
 * shared link is that whoever works the door has no account here.
 *
 * The token is the only credential, so it's checked exactly and nothing
 * about the event is returned unless it matches: no listing, no guessing
 * by id, and a regenerated token silently invalidates the old link.
 *
 * Returns null for an unknown token, a deleted event, one that isn't
 * published, or one whose night is over. That last check is the point:
 * these links get forwarded around WhatsApp and would otherwise keep
 * working forever, long after anyone should still be admitting guests —
 * so it expires itself rather than relying on the organizer remembering
 * to revoke it. An event with no date at all has nothing to expire
 * against and stays valid until revoked by hand.
 */
export async function getEventByCheckInToken(
  token: string,
): Promise<{ id: string; name: string } | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('events')
    .select('id, name, status, event_date, event_end_date')
    .eq('check_in_token', token)
    .is('deleted_at', null)
    .maybeSingle();
  if (!data || data.status !== 'published') return null;

  const endsAt = data.event_end_date ?? data.event_date;
  if (endsAt && Date.now() > new Date(endsAt).getTime() + STAFF_LINK_GRACE_MS) return null;

  return { id: data.id, name: data.name };
}

export type CheckInResult =
  | {
      ok: true;
      alreadyCheckedIn: boolean;
      guestName: string;
      partySize: number;
      checkedInAt: string;
    }
  | { ok: false; reason: 'not_found' | 'not_attending' };

/**
 * The door-scan action: an organizer's phone camera reads a guest's own
 * entry-QR (the same branded card from qr.service.ts — its content is
 * always the guest's RSVP edit link, see generateAndUploadEntryCard's doc
 * comment) and this looks up whoever that link belongs to. Runs on the
 * caller's own (RLS-scoped) client, not the admin one — the existing
 * "guests_manage_members"/"rsvp_responses_manage_members" policies
 * already restrict this to an organizer's own organization, which is
 * exactly the access a check-in scan needs and no more; a QR from someone
 * else's event (even a different event of the *same* organization) is
 * still rejected by the explicit event_id filter below, since the
 * scanner is opened for one specific event.
 *
 * Idempotent by design: scanning an already-used pass a second time
 * returns `alreadyCheckedIn: true` with the original timestamp rather
 * than erroring or double-processing — a guest walking back in during
 * the same event, or a nervous door staffer re-scanning to double check,
 * are both normal, not failures.
 */
export async function checkInGuestByToken(
  supabase: Client,
  eventId: string,
  token: string,
): Promise<CheckInResult> {
  const { data: guest } = await supabase
    .from('guests')
    .select('id, name')
    .eq('secure_token', token)
    .eq('event_id', eventId)
    .is('deleted_at', null)
    .maybeSingle();
  if (!guest) return { ok: false, reason: 'not_found' };

  const { data: response } = await supabase
    .from('rsvp_responses')
    .select('id, status, companions_count, checked_in_at')
    .eq('guest_id', guest.id)
    .maybeSingle();
  // No response at all, or a decline — neither holds a valid entry pass
  // (see generateAndUploadEntryCard's callers: a QR is only ever
  // generated for an 'attending' response in the first place).
  if (!response || response.status !== 'attending') return { ok: false, reason: 'not_attending' };

  const partySize = 1 + response.companions_count;
  const guestName = guest.name ?? '';

  if (response.checked_in_at) {
    return {
      ok: true,
      alreadyCheckedIn: true,
      guestName,
      partySize,
      checkedInAt: response.checked_in_at,
    };
  }

  const checkedInAt = new Date().toISOString();
  const { error } = await supabase
    .from('rsvp_responses')
    .update({ checked_in_at: checkedInAt })
    .eq('id', response.id);
  if (error) throw error;

  return { ok: true, alreadyCheckedIn: false, guestName, partySize, checkedInAt };
}
