'use server';

import { revalidatePath } from 'next/cache';
import { reportActionError } from '@/lib/utils/report-error';
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
  /** Names whose row could not be added — an unusable phone number, or an
   *  insert that failed. Reported alongside addedCount so a partial import
   *  tells the organizer exactly who is missing. */
  rejectedNames?: string[];
};

type GuestRow = { name: string; phone: string; expectedCompanions?: number };

// Truthy-string check for a FormData checkbox/switch value — FormData has
// no boolean type, so "true"/"on" (however the caller serialized it) both
// read as checked.
function readBoolean(value: FormDataEntryValue | null): boolean {
  return value === 'true' || value === 'on';
}

// Stored in E.164 so the same person can't be re-added under a different
// spelling and so WhatsApp gets a number it accepts.
//
// An unparseable value used to be kept as typed. That looked forgiving and
// wasn't: the number is one WhatsApp will reject, so the invitation was
// guaranteed to fail silently, and storing it in a non-canonical form also
// slipped past the duplicate guard — production ended up with six
// duplicate (event, phone) pairs and three numbers that were not E.164.
// Now it returns null and the caller reports which rows were rejected, so
// the organizer can correct them while it still matters.
function canonicalPhone(raw: string | null | undefined): string | null {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return null;
  const result = normalizePhone(trimmed);
  return result.ok ? result.e164 : null;
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

  const mapped = rows
    .map((r) => ({
      name: (r.name ?? '').trim(),
      rawPhone: String(r.phone ?? '').trim(),
      phone: canonicalPhone(r.phone),
      expectedCompanions: parseCompanions(r.expectedCompanions),
    }))
    .filter((g) => g.name.length > 0);

  // A row whose number can't be normalized is set aside rather than
  // silently stored in a shape that will never deliver. The rest of the
  // batch still goes in — one mistyped number in a 300-line paste should
  // not cost the organizer the other 299.
  const rejected = mapped.filter((g) => g.rawPhone && !g.phone).map((g) => g.name);
  const guestsToAdd = mapped.filter((g) => !g.rawPhone || g.phone);
  if (guestsToAdd.length === 0) {
    return rejected.length
      ? { error: 'phoneInvalid', rejectedNames: rejected }
      : { error: 'invalidInput' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthorized' };

  const organizationId = await getCurrentOrganizationId(supabase, user.id);
  if (!organizationId) return { error: 'unknown' };

  const event = await getEvent(supabase, organizationId, eventId);
  if (!event) return { error: 'unknown' };

  // Inserted one at a time so a single bad row can't lose the batch, but
  // the count is tracked: a failure partway used to return a bare
  // 'unknown' with no way for the organizer to tell who actually landed.
  let addedCount = 0;
  const failed: string[] = [];
  for (const guest of guestsToAdd) {
    try {
      await createGuestManually(supabase, eventId, {
        name: guest.name,
        phone: guest.phone,
        email: null,
        expectedCompanions: guest.expectedCompanions,
        isWaitlisted,
      });
      addedCount += 1;
    } catch (error) {
      console.error('[guests] add failed', { name: guest.name, error });
      failed.push(guest.name);
    }
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/events/${eventId}/guests`);
  if (addedCount === 0) return { error: 'unknown', rejectedNames: [...rejected, ...failed] };
  return { addedCount, rejectedNames: [...rejected, ...failed] };
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
  } catch (error) {
    reportActionError('guests', error);
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
