'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentOrganizationId, getEvent } from '@/lib/services/events.service';
import { whatsAppProvider, isWhatsAppConfigured } from '@/lib/whatsapp';
import { checkRateLimit } from '@/lib/utils/rate-limit';

export type BulkMessageActionState = {
  error?: string;
  sentCount?: number;
  failedCount?: number;
  totalRecipients?: number;
};

/**
 * Free-text WhatsApp broadcast to attending guests only — distinct from
 * broadcastResultsAction (which sends a fixed results summary to every
 * guest regardless of their answer). This is for organizer announcements
 * that only make sense for people who are actually coming, e.g. a venue
 * or time change.
 *
 * Outside Meta's 24-hour customer-service window, free-text messages to a
 * guest who hasn't messaged the business number recently will fail — see
 * the WhatsApp note in README.md. Per-recipient failures are counted and
 * reported back rather than failing the whole batch.
 */
export async function sendBulkMessageAction(
  eventId: string,
  _prevState: BulkMessageActionState,
  formData: FormData,
): Promise<BulkMessageActionState> {
  const message = String(formData.get('message') ?? '').trim();
  if (!message || message.length > 1000) return { error: 'invalidInput' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthorized' };

  const organizationId = await getCurrentOrganizationId(supabase, user.id);
  if (!organizationId) return { error: 'unknown' };

  const event = await getEvent(supabase, organizationId, eventId);
  if (!event) return { error: 'unknown' };

  if (!isWhatsAppConfigured()) return { error: 'notConfigured' };

  // A handful of legitimate resends per hour (a typo fix, a follow-up) is
  // normal; this only guards against a runaway loop or abuse, not real use.
  const allowed = await checkRateLimit(supabase, {
    action: 'bulk-message',
    scope: eventId,
    maxHits: 5,
    windowSeconds: 3600,
  });
  if (!allowed) return { error: 'rateLimited' };

  const { data: responses, error: responsesError } = await supabase
    .from('rsvp_responses')
    .select('guest_id')
    .eq('event_id', eventId)
    .eq('status', 'attending');
  if (responsesError) return { error: 'unknown' };

  const guestIds = responses.map((r) => r.guest_id);
  if (guestIds.length === 0) return { sentCount: 0, failedCount: 0, totalRecipients: 0 };

  const { data: guests, error: guestsError } = await supabase
    .from('guests')
    .select('phone')
    .in('id', guestIds)
    .is('deleted_at', null);
  if (guestsError) return { error: 'unknown' };

  const phones = guests.map((g) => g.phone).filter((p): p is string => Boolean(p));
  if (phones.length === 0) return { sentCount: 0, failedCount: 0, totalRecipients: 0 };

  let sentCount = 0;
  let failedCount = 0;
  for (const phone of phones) {
    try {
      await whatsAppProvider.send({ to: phone, text: message });
      sentCount += 1;
    } catch (error) {
      console.error('[bulk-message] send failed', error);
      failedCount += 1;
    }
  }

  return { sentCount, failedCount, totalRecipients: phones.length };
}
