'use server';

import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { deleteGuest } from '@/lib/services/guests.service';

export async function deleteGuestAction(eventId: string, guestId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await deleteGuest(supabase, guestId);

  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/events/${eventId}/guests`);
}
