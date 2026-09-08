'use server';

import { getLocale } from 'next-intl/server';
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

  const locale = (await getLocale()) as 'ar' | 'en';

  try {
    return await broadcastEventResults(supabase, event, locale);
  } catch {
    return { error: 'unknown' };
  }
}
