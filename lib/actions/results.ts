'use server';

import { getLocale } from 'next-intl/server';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { getCurrentOrganizationId, getEvent } from '@/lib/services/events.service';
import { broadcastEventResults } from '@/lib/services/results.service';

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

  // Results go to every guest who left a number, so a double-click or an
  // impatient organizer used to mean everyone got the message twice, at
  // Meta's per-conversation rate. Same ceiling sendBulkMessageAction uses.
  const allowed = await checkRateLimit({
    action: 'broadcast-results',
    scope: eventId,
    maxHits: 3,
    windowSeconds: 60 * 60,
  });
  if (!allowed) return { error: 'rateLimited' };

  const locale = (await getLocale()) as 'ar' | 'en';

  try {
    const result = await broadcastEventResults(supabase, event, locale);
    // Record that results went out, so the deadline cron doesn't send them
    // a second time. Without this, any event with auto_broadcast_results on
    // sent a guaranteed duplicate once its deadline passed.
    await supabase
      .from('events')
      .update({ results_broadcast_at: new Date().toISOString() })
      .eq('id', eventId)
      .eq('organization_id', organizationId);
    return result;
  } catch {
    return { error: 'unknown' };
  }
}
