'use server';

import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { rsvpFormSchema, rsvpStatuses } from '@/lib/validations/rsvp';
import {
  submitRsvp,
  updateRsvpByToken,
  insertFirstResponseByToken,
} from '@/lib/services/rsvp.service';
import { generateAndUploadEntryCard } from '@/lib/services/qr.service';
import { promoteNextWaitlistedGuest } from '@/lib/services/waitlist.service';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { normalizePhone } from '@/lib/utils/phone';
import { notifyOrganizerNewRsvp, sendGuestRsvpConfirmation } from '@/lib/email/notify';
import { sendGuestRsvpConfirmationWhatsApp, sendGuestQrWhatsApp } from '@/lib/whatsapp/notify';
import type { Json } from '@/types/supabase';

/**
 * Fetched through the service-role client rather than the caller's own
 * (anon) `supabase` — both submitRsvpAction and updateRsvpAction run
 * unauthenticated, and `events` SELECT is RLS-restricted to
 * public+published events, which would silently fail to resolve this for
 * a private event. Best-effort: returns null on any error, and every
 * caller treats that as "skip the QR send", never as a reason to fail
 * the RSVP itself.
 */
async function getQrEligibility(
  eventId: string,
): Promise<{ isQrEnabled: boolean; eventName: string } | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('events')
      .select('name, is_qr_enabled')
      .eq('id', eventId)
      .single();
    if (!data) return null;
    return { isQrEnabled: data.is_qr_enabled, eventName: data.name };
  } catch {
    return null;
  }
}

export type RsvpActionState = {
  error?: string;
  secureToken?: string;
  success?: boolean;
  // Set whenever the event has entry QR enabled and this response is
  // 'attending' — shown inline on the thank-you screen regardless of
  // whether the guest gave a phone/email at all, since a WhatsApp send to
  // a Link-track guest's own number has no active 24-hour session window
  // to ride on (see sendGuestQrWhatsApp's doc comment) and silently never
  // arrives. This is the reliable copy of the same card.
  qrCardUrl?: string;
};

// `null` (the field wasn't included in the form at all) means "don't touch
// existing question answers" — distinct from `[]` (field present but
// empty), which means "replace with no answers". See
// updateRsvpByToken()'s doc comment for why this distinction matters.
function readAnswers(formData: FormData): { question_id: string; answer_value: Json }[] | null {
  if (!formData.has('answers')) return null;
  const raw = formData.get('answers');
  if (typeof raw !== 'string' || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function readCompanionsNames(formData: FormData): string[] {
  const raw = formData.get('companionsNames');
  if (typeof raw !== 'string' || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'string' && n) : [];
  } catch {
    return [];
  }
}

export async function submitRsvpAction(
  eventSlug: string,
  _prevState: RsvpActionState,
  formData: FormData,
): Promise<RsvpActionState> {
  if (!isSupabaseConfigured()) return { error: 'notConfigured' };

  const status = formData.get('status');
  const parsed = rsvpFormSchema.safeParse({
    guestName: formData.get('guestName'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    status,
    companionsNames: readCompanionsNames(formData).map((name) => ({ name })),
    message: formData.get('message'),
  });

  if (!parsed.success || !rsvpStatuses.includes(parsed.data.status)) {
    return { error: 'invalidInput' };
  }

  // Canonical E.164 from here on, not whatever shape the guest typed —
  // storing raw input would let the exact-string duplicate check below be
  // defeated by typing the same real number in a different format, on top
  // of accepting outright garbage as a "phone number" with a silent send
  // failure downstream. Skipped entirely when no phone was given at all;
  // that's still a valid submission unless the organizer requires one.
  let phone: string | undefined;
  if (parsed.data.phone) {
    const phoneResult = normalizePhone(parsed.data.phone);
    if (!phoneResult.ok) return { error: 'phoneInvalid' };
    phone = phoneResult.e164;
  }

  const supabase = await createClient();

  const allowed = await checkRateLimit({
    action: 'rsvp',
    scope: eventSlug,
    maxHits: 5,
    windowSeconds: 60,
  });
  if (!allowed) return { error: 'rateLimited' };

  try {
    const result = await submitRsvp(supabase, {
      eventSlug,
      guestName: parsed.data.guestName,
      phone: phone ?? null,
      email: parsed.data.email ?? null,
      status: parsed.data.status,
      companionsCount: parsed.data.companionsNames.length,
      companionsNames: parsed.data.companionsNames.map((c) => c.name),
      message: parsed.data.message ?? null,
      // A brand-new response has no existing answers to preserve, so null
      // vs [] doesn't matter here — normalize for the (non-nullable)
      // submitRsvp() signature.
      answers: readAnswers(formData) ?? [],
    });

    // Best-effort notifications (internally swallow their own errors) — we
    // still `await` them because serverless functions can be frozen the
    // instant the response is returned, which would kill a fire-and-forget
    // promise before it finishes.
    await notifyOrganizerNewRsvp(eventSlug, parsed.data.guestName, parsed.data.status);
    const locale = (await getLocale()) as 'ar' | 'en';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const editUrl = `${appUrl}/${locale}/rsvp/${result.secure_token}`;

    // Generated once regardless of whether a phone/email was given at all
    // — the card's content is the guest's own edit link, which exists
    // either way — so it can both ride along on a best-effort WhatsApp
    // send below AND be returned for the thank-you screen to render
    // directly, the one path guaranteed to actually reach the guest.
    let qrCardUrl: string | undefined;
    let eventName: string | undefined;
    if (parsed.data.status === 'attending') {
      const eligibility = await getQrEligibility(result.event_id);
      if (eligibility?.isQrEnabled) {
        eventName = eligibility.eventName;
        const url = await generateAndUploadEntryCard(
          `guest-${result.guest_id}`,
          editUrl,
          1 + parsed.data.companionsNames.length,
        );
        if (url) qrCardUrl = url;
      }
    }

    if (parsed.data.email) {
      await sendGuestRsvpConfirmation(eventSlug, parsed.data.email, editUrl, locale);
    }
    if (phone) {
      await sendGuestRsvpConfirmationWhatsApp(
        eventSlug,
        phone,
        parsed.data.status,
        editUrl,
        locale,
      );

      if (qrCardUrl && eventName) {
        await sendGuestQrWhatsApp(
          eventName,
          qrCardUrl,
          parsed.data.guestName,
          phone,
          locale,
          editUrl,
        );
      }
    }

    // A brand-new submission has no "previous status" to compare against —
    // any first-time 'not_attending' is a genuine decline, so promote
    // straight away (see promoteNextWaitlistedGuest's doc comment).
    if (parsed.data.status === 'not_attending') {
      await promoteNextWaitlistedGuest(result.event_id, eventSlug, locale);
    }

    return { success: true, secureToken: result.secure_token, qrCardUrl };
  } catch (error) {
    // See the migration's comment on submit_rsvp — 'unique_violation'
    // (23505) is raised only for the duplicate-phone case, distinct from
    // every other rejection in that function (which stay a generic
    // 'submitFailed' — a guest can't do anything about a closed deadline
    // by retrying, but "you already responded" is worth saying plainly).
    if ((error as { code?: string }).code === '23505') return { error: 'phoneDuplicate' };
    return { error: 'submitFailed' };
  }
}

export async function updateRsvpAction(
  token: string,
  _prevState: RsvpActionState,
  formData: FormData,
): Promise<RsvpActionState> {
  if (!isSupabaseConfigured()) return { error: 'notConfigured' };

  const status = formData.get('status');
  const parsed = rsvpFormSchema.omit({ guestName: true, phone: true, email: true }).safeParse({
    status,
    companionsNames: readCompanionsNames(formData).map((name) => ({ name })),
    message: formData.get('message'),
  });

  if (!parsed.success || !rsvpStatuses.includes(parsed.data.status)) {
    return { error: 'invalidInput' };
  }

  const supabase = await createClient();

  const allowed = await checkRateLimit({
    action: 'rsvp-edit',
    scope: token,
    maxHits: 10,
    windowSeconds: 60,
  });
  if (!allowed) return { error: 'rateLimited' };

  try {
    let result;
    try {
      result = await updateRsvpByToken(supabase, {
        token,
        status: parsed.data.status,
        companionsCount: parsed.data.companionsNames.length,
        companionsNames: parsed.data.companionsNames.map((c) => c.name),
        message: parsed.data.message ?? null,
        answers: readAnswers(formData),
      });
    } catch (error) {
      // update_rsvp_by_token is an UPDATE — it raises P0002 for a guest
      // who has an invitation but no response row yet at all (their
      // invite link opened, or their first response submitted, before
      // ever tapping Accept/Decline in WhatsApp). Falls back to creating
      // that first response instead of failing it.
      if ((error as { code?: string }).code === 'P0002') {
        result = await insertFirstResponseByToken(token, {
          status: parsed.data.status,
          companionsCount: parsed.data.companionsNames.length,
          companionsNames: parsed.data.companionsNames.map((c) => c.name),
          message: parsed.data.message ?? null,
          answers: readAnswers(formData),
        });
      } else {
        throw error;
      }
    }

    // Only promote on a genuine new decline — a guest re-submitting an
    // already-'not_attending' response (or flipping back and forth)
    // shouldn't burn through the waitlist on every resubmission.
    // `result` is null when the token wasn't a uuid at all — nothing was
    // updated, so there is nothing to promote against either.
    if (!result) return { error: 'notFound' };

    // Only promote on a genuine new decline — a guest re-submitting an
    // already-'not_attending' response (or flipping back and forth)
    // shouldn't burn through the waitlist on every resubmission.
    if (parsed.data.status === 'not_attending' && result.previous_status !== 'not_attending') {
      const locale = (await getLocale()) as 'ar' | 'en';
      await promoteNextWaitlistedGuest(result.event_id, result.event_slug, locale);
    }

    // Same "genuine new transition" guard for the QR send — a guest
    // re-submitting an already-'attending' edit (changing their companion
    // count, say) shouldn't get a fresh QR every time.
    if (parsed.data.status === 'attending' && result?.previous_status !== 'attending') {
      try {
        const admin = createAdminClient();
        const { data: guest } = await admin
          .from('guests')
          .select('id, name, phone')
          .eq('secure_token', token)
          .single();
        if (guest?.phone) {
          const eligibility = await getQrEligibility(result.event_id);
          if (eligibility?.isQrEnabled) {
            const locale = (await getLocale()) as 'ar' | 'en';
            const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
            const editUrl = `${appUrl}/${locale}/rsvp/${token}`;
            const qrUrl = await generateAndUploadEntryCard(
              `guest-${guest.id}`,
              editUrl,
              1 + parsed.data.companionsNames.length,
            );
            if (qrUrl) {
              await sendGuestQrWhatsApp(
                eligibility.eventName,
                qrUrl,
                guest.name ?? '',
                guest.phone,
                locale,
                editUrl,
              );
            }
          }
        }
      } catch {
        // Best-effort — the RSVP update itself already succeeded.
      }
    }

    return { success: true };
  } catch (error) {
    console.error('[rsvp] updateRsvpAction failed', error);
    return { error: 'submitFailed' };
  }
}
