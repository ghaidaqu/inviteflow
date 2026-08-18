'use server';

import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { deleteGuest, createGuestManually, updateGuest } from '@/lib/services/guests.service';
import { getCurrentOrganizationId, getEvent } from '@/lib/services/events.service';
import { sendInvitationWhatsApp } from '@/lib/whatsapp/notify';
import { normalizeDigits } from '@/lib/utils/digits';
import { normalizePhone } from '@/lib/utils/phone';

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

type GuestRow = { name: string; phone: string; expectedCompanions?: number };

// Truthy-string check for a FormData checkbox/switch value — FormData has
// no boolean type, so "true"/"on" (however the caller serialized it) both
// read as checked.
function readBoolean(value: FormDataEntryValue | null): boolean {
  return value === 'true' || value === 'on';
}

// Stored in E.164 so the same person can't be re-added under a different
// spelling and so WhatsApp gets a number it accepts. An unparseable value is
// kept as typed rather than dropped — the organizer can still see and fix it.
function canonicalPhone(raw: string | null | undefined): string | null {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return null;
  const result = normalizePhone(trimmed);
  return result.ok ? result.e164 : normalizeDigits(trimmed);
}

// The organizer's own estimate of party size. Clamped rather than rejected:
// a stray non-numeric or negative value should quietly mean "just them",
// not fail the whole batch of guests being added.
function parseCompanions(value: unknown): number {
  const n = Number(normalizeDigits(String(value ?? '0')).trim());
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.floor(n), 50);
}

/**
 * `guestRows` is a JSON-encoded array of {name, phone, expectedCompanions}
 * coming from the add-guests dialog, after the organizer has reviewed and
 * confirmed what will be created (see AddGuestsDialog). Numbers arrive
 * already normalized, but are re-normalized here too: a server action is a
 * public entry point and can't trust its caller.
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
  if (!Array.isArray(rows) || rows.length > 1000) return { error: 'invalidInput' };

  // Applies to the whole batch being added, not per-row — matches how the
  // dialog frames it ("add this list as a reserve list"), not a per-person
  // toggle. A guest can still be moved individually later from the guest
  // table's edit dialog.
  const isWaitlisted = readBoolean(formData.get('isWaitlisted'));

  const guestsToAdd = rows
    .map((r) => ({
      name: (r.name ?? '').trim(),
      phone: canonicalPhone(r.phone),
      expectedCompanions: parseCompanions(r.expectedCompanions),
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
        expectedCompanions: guest.expectedCompanions,
        isWaitlisted,
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
      phone: canonicalPhone(phoneRaw),
      expectedCompanions: parseCompanions(formData.get('expectedCompanions')),
      isWaitlisted: readBoolean(formData.get('isWaitlisted')),
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
