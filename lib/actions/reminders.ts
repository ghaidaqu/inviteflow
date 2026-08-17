'use server';

import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentOrganizationId, getEvent } from '@/lib/services/events.service';
import { cancelEventReminder } from '@/lib/services/reminders.service';

export async function cancelReminderAction(eventId: string, reminderId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const organizationId = await getCurrentOrganizationId(supabase, user.id);
  if (!organizationId) return;

  // Ownership check — cancelEventReminder itself also relies on RLS, but
  // this confirms the event actually belongs to the caller's organization
  // before touching anything.
  const event = await getEvent(supabase, organizationId, eventId);
  if (!event) return;

  await cancelEventReminder(supabase, reminderId);

  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/events/${eventId}`);
}
