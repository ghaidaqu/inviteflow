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
import { promoteNextWaitlistedGuest } from '@/lib/services/waitlist.service';
import { checkRateLimit } from '@/lib/utils/rate-limit';
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

  const supabase = await createClient();

  const allowed = await checkRateLimit(supabase, {
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
      phone: parsed.data.phone ?? null,
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
    if (parsed.data.email || parsed.data.phone) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
      const editUrl = `${appUrl}/${locale}/rsvp/${result.secure_token}`;
      if (parsed.data.email) {
        await sendGuestRsvpConfirmation(eventSlug, parsed.data.email, editUrl, locale);
      }
      if (parsed.data.phone) {
        await sendGuestRsvpConfirmationWhatsApp(
          eventSlug,
          parsed.data.phone,
          parsed.data.status,
          editUrl,
          locale,
        );

        // A brand-new submission has no "previous status" to compare
        // against — any first-time 'attending' is a genuine acceptance.
        if (parsed.data.status === 'attending') {
          const eligibility = await getQrEligibility(result.event_id);
          if (eligibility?.isQrEnabled) {
            await sendGuestQrWhatsApp(
              eligibility.eventName,
              result.guest_id,
              parsed.data.guestName,
              1 + parsed.data.companionsNames.length,
              parsed.data.phone,
              editUrl,
              locale,
            );
          }
        }
      }
    }

    // A brand-new submission has no "previous status" to compare against —
    // any first-time 'not_attending' is a genuine decline, so promote
    // straight away (see promoteNextWaitlistedGuest's doc comment).
    if (parsed.data.status === 'not_attending') {
      await promoteNextWaitlistedGuest(supabase, result.event_id, eventSlug, locale);
    }

    return { success: true, secureToken: result.secure_token };
  } catch {
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

  const allowed = await checkRateLimit(supabase, {
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
    if (parsed.data.status === 'not_attending' && result?.previous_status !== 'not_attending') {
      const locale = (await getLocale()) as 'ar' | 'en';
      await promoteNextWaitlistedGuest(supabase, result.event_id, result.event_slug, locale);
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
            await sendGuestQrWhatsApp(
              eligibility.eventName,
              guest.id,
              guest.name ?? '',
              1 + parsed.data.companionsNames.length,
              guest.phone,
              editUrl,
              locale,
            );
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
