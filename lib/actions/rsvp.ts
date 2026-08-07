'use server';

import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { rsvpFormSchema, rsvpStatuses } from '@/lib/validations/rsvp';
import { submitRsvp, updateRsvpByToken } from '@/lib/services/rsvp.service';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { notifyOrganizerNewRsvp, sendGuestRsvpConfirmation } from '@/lib/email/notify';
import { sendGuestRsvpConfirmationWhatsApp } from '@/lib/whatsapp/notify';
import type { Json } from '@/types/supabase';

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
    if (parsed.data.email || parsed.data.phone) {
      const locale = (await getLocale()) as 'ar' | 'en';
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
      }
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
    await updateRsvpByToken(supabase, {
      token,
      status: parsed.data.status,
      companionsCount: parsed.data.companionsNames.length,
      companionsNames: parsed.data.companionsNames.map((c) => c.name),
      message: parsed.data.message ?? null,
      answers: readAnswers(formData),
    });

    return { success: true };
  } catch {
    return { error: 'submitFailed' };
  }
}
