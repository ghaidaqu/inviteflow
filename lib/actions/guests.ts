'use server';

import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { deleteGuest, createGuestManually, updateGuest } from '@/lib/services/guests.service';
import { getCurrentOrganizationId, getEvent } from '@/lib/services/events.service';
import { sendInvitationWhatsApp } from '@/lib/whatsapp/notify';
import { normalizeDigits } from '@/lib/utils/digits';

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

type GuestRow = { name: string; phone: string };

/**
 * `guestRows` is a JSON-encoded array of {name, phone} — one explicit row
 * per guest from the add-guest dialog's repeatable name/phone field pairs
 * (see GuestsTable), not a free-text "Name, phone" line the organizer had
 * to format correctly themselves. Phone digits are normalized (Arabic-Indic
 * → ASCII) so a number typed on an Arabic keyboard still saves correctly.
 */
export async function addGuestsAction(
  eventId: string,
  _prevState: AddGuestsActionState,
  formData: FormData,
): Promise<AddGuestsActionState> {
  const raw = formData.get('guestRows');
  if (typeof raw !== 'string' || !raw.trim()) return { error: 'invalidInput' };

  let rows: GuestRow[];
  try {
    rows = JSON.parse(raw);
  } catch {
    return { error: 'invalidInput' };
  }

  const guestsToAdd = rows
    .map((r) => ({
      name: (r.name ?? '').trim(),
      phone: r.phone ? normalizeDigits(r.phone.trim()) : null,
    }))
    .filter((g) => g.name.length > 0);
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

export type UpdateGuestActionState = {
  error?: string;
  ok?: boolean;
};

export async function updateGuestAction(
  eventId: string,
  guestId: string,
  _prevState: UpdateGuestActionState,
  formData: FormData,
): Promise<UpdateGuestActionState> {
  const name = String(formData.get('name') ?? '').trim();
  const phoneRaw = String(formData.get('phone') ?? '').trim();
  if (!name) return { error: 'invalidInput' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthorized' };

  try {
    await updateGuest(supabase, guestId, {
      name,
      phone: phoneRaw ? normalizeDigits(phoneRaw) : null,
    });
  } catch {
    return { error: 'unknown' };
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/events/${eventId}/guests`);
  return { ok: true };
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
