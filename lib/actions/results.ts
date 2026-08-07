'use server';

import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentOrganizationId, getEvent } from '@/lib/services/events.service';
import { getResultsSummary } from '@/lib/services/results.service';
import { sendResultsBroadcastEmail } from '@/lib/email/notify';
import { sendResultsBroadcastWhatsApp } from '@/lib/whatsapp/notify';

export type BroadcastResultsActionState = {
  error?: string;
  sentCount?: number;
  totalGuests?: number;
};

export async function broadcastResultsAction(
  eventId: string,
): Promise<BroadcastResultsActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthorized' };

  const organizationId = await getCurrentOrganizationId(supabase, user.id);
  if (!organizationId) return { error: 'unknown' };

  const event = await getEvent(supabase, organizationId, eventId);
  if (!event) return { error: 'unknown' };

  const { data: guests, error: guestsError } = await supabase
    .from('guests')
    .select('name, email, phone')
    .eq('event_id', eventId)
    .is('deleted_at', null);
  if (guestsError) return { error: 'unknown' };

  if (guests.length === 0) return { sentCount: 0, totalGuests: 0 };

  const summary = await getResultsSummary(supabase, eventId);
  const locale = (await getLocale()) as 'ar' | 'en';

  let sentCount = 0;
  for (const guest of guests) {
    let sent = false;
    if (guest.email) {
      sent = (await sendResultsBroadcastEmail(event.name, guest.email, summary, locale)) || sent;
    }
    if (guest.phone) {
      sent = (await sendResultsBroadcastWhatsApp(event.slug, guest.phone, summary, locale)) || sent;
    }
    if (sent) sentCount += 1;
  }

  return { sentCount, totalGuests: guests.length };
}
