'use server';

import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { deleteGuest, createGuestManually } from '@/lib/services/guests.service';
import { getCurrentOrganizationId, getEvent } from '@/lib/services/events.service';
import { sendInvitationWhatsApp } from '@/lib/whatsapp/notify';

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

export type AddGuestsActionState = {
  error?: string;
  addedCount?: number;
};

/**
 * Parses "Name, phone" (or "Name - phone", or just "Name") per line — one
 * guest per line — so the organizer can paste a whole list at once instead
 * of adding people one at a time.
 */
function parseGuestLines(raw: string): { name: string; phone: string | null }[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/[,–-]/).map((p) => p.trim());
      const name = parts[0] ?? '';
      const phone = parts[1] || null;
      return { name, phone };
    })
    .filter((g) => g.name);
}

export async function addGuestsAction(
  eventId: string,
  _prevState: AddGuestsActionState,
  formData: FormData,
): Promise<AddGuestsActionState> {
  const raw = formData.get('guestLines');
  if (typeof raw !== 'string' || !raw.trim()) return { error: 'invalidInput' };

  const guestsToAdd = parseGuestLines(raw);
  if (guestsToAdd.length === 0) return { error: 'invalidInput' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthorized' };

  const organizationId = await getCurrentOrganizationId(supabase, user.id);
  if (!organizationId) return { error: 'unknown' };

  const event = await getEvent(supabase, organizationId, eventId);
  if (!event) return { error: 'unknown' };

  try {
    for (const guest of guestsToAdd) {
      await createGuestManually(supabase, eventId, {
        name: guest.name,
        phone: guest.phone,
        email: null,
      });
    }
  } catch {
    return { error: 'unknown' };
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/events/${eventId}/guests`);
  return { addedCount: guestsToAdd.length };
}

export type SendInviteActionState = {
  ok?: boolean;
  notConfigured?: boolean;
  error?: string;
};

export async function sendGuestInviteAction(
  eventId: string,
  guestId: string,
): Promise<SendInviteActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthorized' };

  const organizationId = await getCurrentOrganizationId(supabase, user.id);
  if (!organizationId) return { error: 'unknown' };

  const event = await getEvent(supabase, organizationId, eventId);
  if (!event) return { error: 'unknown' };

  const { data: guest } = await supabase
    .from('guests')
    .select('name, phone')
    .eq('id', guestId)
    .single();

  if (!guest?.phone) return { error: 'noPhone' };

  const locale = (await getLocale()) as 'ar' | 'en';
  const result = await sendInvitationWhatsApp(
    event.slug,
    guestId,
    guest.name ?? '',
    guest.phone,
    locale,
  );

  if (!result.configured) return { notConfigured: true };
  if (!result.ok) return { error: 'sendFailed' };
  return { ok: true };
}
