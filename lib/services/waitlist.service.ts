import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { sendInvitationWhatsApp } from '@/lib/whatsapp/notify';

type Client = SupabaseClient<Database>;
type Locale = 'ar' | 'en';

/**
 * Called right after a guest's response is recorded as 'not_attending' —
 * from all three places that can happen: the public RSVP form
 * (submitRsvpAction), a guest editing their own response via their secure
 * link (updateRsvpAction), and a WhatsApp button tap (the webhook route).
 * Callers are responsible for only calling this on a genuine *new*
 * transition into 'not_attending' (not a repeat/no-op decline) — see each
 * call site for how it compares against the previous status.
 *
 * Promotes exactly one waitlisted guest per decline — a 1:1 backfill, not
 * a capacity refill. Goes through the promote_next_waitlisted_guest RPC
 * rather than querying/updating `guests` directly, because the callers
 * here run as anon (a guest submitting a public form has no session), and
 * `guests` is RLS-locked to organization members — the RPC is a security
 * definer function the same way submit_rsvp and respond_via_whatsapp are.
 */
export async function promoteNextWaitlistedGuest(
  supabase: Client,
  eventId: string,
  eventSlug: string,
  locale: Locale,
): Promise<void> {
  const { data, error } = await supabase.rpc('promote_next_waitlisted_guest', {
    p_event_id: eventId,
  });
  if (error) {
    console.error('[waitlist] promote_next_waitlisted_guest failed', error);
    return;
  }

  const promoted = data?.[0];
  if (!promoted) return; // no one waitlisted (or none with a phone number)

  try {
    await sendInvitationWhatsApp(
      eventSlug,
      promoted.guest_id,
      promoted.name ?? '',
      promoted.phone,
      locale,
    );
  } catch (sendError) {
    // The promotion itself already committed (is_waitlisted is false) —
    // worst case the organizer has to send this one guest manually from
    // the guests page, same as any other failed send.
    console.error('[waitlist] promotion send failed', sendError);
  }
}
