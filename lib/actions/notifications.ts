'use server';

import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentOrganizationId } from '@/lib/services/events.service';
import {
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/services/notifications.service';

export async function markNotificationReadAction(notificationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await markNotificationRead(supabase, notificationId);

  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard`);
}

export async function markAllNotificationsReadAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const organizationId = await getCurrentOrganizationId(supabase, user.id);
  if (!organizationId) return;

  await markAllNotificationsRead(supabase, organizationId);

  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard`);
}
