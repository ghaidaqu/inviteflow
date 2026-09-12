import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { isDeliveryStatus, shouldApplyStatus } from '@/lib/whatsapp/delivery-status';
import type { Database } from '@/types/supabase';

type Client = SupabaseClient<Database>;
type DeliveryRow = Database['public']['Tables']['whatsapp_deliveries']['Row'];

export type DeliveryKind = DeliveryRow['kind'];

/**
 * Records that we handed a message to Meta and it was accepted.
 *
 * Called on the send path with the wamid the API returned, because that
 * id is the only thing a later status webhook gives us to work back from
 * — see the migration's note. Uses the admin client on purpose: sends
 * happen in contexts with no signed-in user at all (the reminders cron,
 * the WhatsApp webhook replying to a guest), and RLS grants members read
 * access only.
 *
 * Deliberately swallows its own errors. Losing a delivery receipt is a
 * reporting gap; failing the invitation send because we couldn't write
 * the receipt would be a real outage. The caller has already sent the
 * message by the time this runs and cannot un-send it.
 */
export async function recordWhatsAppSend(input: {
  messageId: string | undefined;
  eventId: string;
  guestId?: string | null;
  kind: DeliveryKind;
}): Promise<void> {
  if (!input.messageId) return;
  try {
    const admin = createAdminClient();
    await admin.from('whatsapp_deliveries').upsert(
      {
        message_id: input.messageId,
        event_id: input.eventId,
        guest_id: input.guestId ?? null,
        kind: input.kind,
        status: 'accepted',
      },
      { onConflict: 'message_id' },
    );
  } catch (error) {
    console.error('[whatsapp] could not record send', error);
  }
}

/**
 * Applies one status entry from the WhatsApp webhook.
 *
 * A message id we've never seen is ignored rather than inserted: it means
 * the send wasn't one of ours to track (or predates this table), and a
 * row with no event couldn't be shown to anyone anyway.
 */
export async function applyWhatsAppStatus(input: {
  messageId: string;
  status: string;
  errorCode?: number | null;
  errorDetail?: string | null;
}): Promise<void> {
  if (!isDeliveryStatus(input.status)) return;
  const next = input.status;

  try {
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from('whatsapp_deliveries')
      .select('id, status')
      .eq('message_id', input.messageId)
      .maybeSingle();

    if (!existing) return;
    if (!shouldApplyStatus(existing.status, next)) return;

    await admin
      .from('whatsapp_deliveries')
      .update({
        status: next,
        error_code: input.errorCode ?? null,
        error_detail: input.errorDetail ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } catch (error) {
    console.error('[whatsapp] could not apply status', error);
  }
}

/**
 * The latest invitation delivery per guest for one event, keyed by guest
 * id, for the organizer's guest list.
 *
 * Scoped to 'invitation' because that is the send whose failure changes
 * what the organizer must do — a guest who never received the invitation
 * needs a corrected number and a resend. A failed entry pass or reminder
 * is worth knowing but isn't the same alarm, and mixing them into one
 * per-guest badge would blur exactly the signal this exists to give.
 */
export async function getInvitationDeliveriesByGuest(
  supabase: Client,
  eventId: string,
): Promise<Map<string, DeliveryRow>> {
  const { data, error } = await supabase
    .from('whatsapp_deliveries')
    .select('*')
    .eq('event_id', eventId)
    .eq('kind', 'invitation')
    .order('created_at', { ascending: true });

  if (error) throw error;

  // Ascending order plus an unconditional set leaves the newest attempt
  // per guest — a resend after a wrong number should replace the failure
  // it was sent to fix, not be hidden behind it.
  const byGuest = new Map<string, DeliveryRow>();
  for (const row of data ?? []) {
    if (row.guest_id) byGuest.set(row.guest_id, row);
  }
  return byGuest;
}

/**
 * How many of this event's invitations WhatsApp could not deliver.
 *
 * Surfaced on the event page rather than only inside the guest list: a
 * wrong number is fixable, but only while there is still time before the
 * event, so it has to be visible without going looking for it.
 */
/**
 * Meta's error codes that mean "this will never be delivered as sent",
 * mapped to something an organizer can act on. 131047 is the one that
 * matters most: a free-form message outside the 24-hour window. It is not
 * a wrong number — it is a missing approved template.
 */
export function deliveryFailureReason(errorCode: number | null): string {
  switch (errorCode) {
    case 131047:
      return 'needsTemplate';
    case 131026:
    case 131052:
      return 'notOnWhatsApp';
    case 131048:
    case 131049:
      return 'blockedBySpamPolicy';
    // The account's own daily cap, not anything wrong with the guest.
    // It matters because an unverified business starts at TIER_250 — 250
    // unique recipients per rolling 24 hours — and a single 300-guest
    // event walks straight into it. Left unmapped, the organizer saw
    // "unknown" against a perfectly good number and had no idea the send
    // would succeed if they simply waited.
    case 130429:
    case 131056:
      return 'dailyLimitReached';
    default:
      return 'unknown';
  }
}

export async function countFailedInvitations(supabase: Client, eventId: string): Promise<number> {
  const { count, error } = await supabase
    .from('whatsapp_deliveries')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('kind', 'invitation')
    .eq('status', 'failed');

  if (error) throw error;
  return count ?? 0;
}
