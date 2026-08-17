'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentOrganizationId, createEvent } from '@/lib/services/events.service';
import { createGuestManually } from '@/lib/services/guests.service';
import { replaceQuestions } from '@/lib/services/questions.service';
import { sendInvitationWhatsApp } from '@/lib/whatsapp/notify';
import { normalizePhone } from '@/lib/utils/phone';
import { normalizeDigits } from '@/lib/utils/digits';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { eventTypes } from '@/lib/validations/events';
import type { QuestionInput } from '@/lib/validations/questions';

export type QuickStartDraft = {
  track: 'invitation' | 'rsvp';
  name: string;
  type: string;
  description: string;
  eventDate: string;
  locationText: string;
  coverImageUrl: string;
  isQrEnabled: boolean;
  questions: QuestionInput[];
  guestName: string;
  guestPhone: string;
};

export type QuickStartResult = {
  error?: string;
};

function canonicalPhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const result = normalizePhone(trimmed);
  return result.ok ? result.e164 : normalizeDigits(trimmed);
}

/**
 * The only place in the whole /start flow that writes to the database —
 * called right after login (see FinishCreating). Creates the real event
 * with everything the organizer filled in before authenticating (cover
 * image, QR setting, custom questions for the Link track), then — if they
 * gave a test contact — adds that guest and sends them the actual
 * invitation (real Accept/Decline/Maybe buttons, real QR), exactly what a
 * guest would get. This *is* the free trial; there's no separate
 * lightweight preview message.
 *
 * The auto-send is capped at 3 uses per account (checkRateLimit, scope =
 * user.id, no time window reset needed since this is a lifetime cap on
 * the free trial, not a spam guard) — after that the event still gets
 * created normally, just without the automatic send; the organizer can
 * always send a guest their invitation manually from the guests page,
 * which has no such limit. There's no payment gate here because no
 * payment provider is connected yet — see README's pricing note.
 */
export async function createEventFromQuickStartAction(
  draft: QuickStartDraft,
): Promise<QuickStartResult> {
  if (!draft.name.trim() || draft.name.length > 150) return { error: 'invalidInput' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthorized' };

  const organizationId = await getCurrentOrganizationId(supabase, user.id);
  if (!organizationId) return { error: 'unknown' };

  const locale = (await getLocale()) as 'ar' | 'en';
  const eventType = (eventTypes as readonly string[]).includes(draft.type) ? draft.type : 'other';
  const eventDate =
    draft.eventDate && !Number.isNaN(Date.parse(draft.eventDate)) ? draft.eventDate : undefined;

  let eventId: string;
  let eventSlug: string;
  try {
    const event = await createEvent(supabase, organizationId, user.id, {
      name: draft.name,
      type: eventType as (typeof eventTypes)[number],
      description: draft.description || undefined,
      eventDate,
      rsvpDeadline: undefined,
      locationText: draft.locationText || undefined,
      locationMapUrl: undefined,
      coverImageUrl: draft.coverImageUrl || undefined,
      primaryLocale: locale,
      visibility: 'private',
      isRsvpEnabled: true,
      isQrEnabled: draft.isQrEnabled,
      isPasswordProtected: false,
      password: undefined,
      eventEndDate: undefined,
      organizationName: undefined,
      organizationLogoUrl: undefined,
    });
    eventId = event.id;
    eventSlug = event.slug;
  } catch {
    return { error: 'unknown' };
  }

  if (draft.track === 'rsvp') {
    const filledQuestions = draft.questions.filter((q) => q.textAr.trim().length > 0);
    if (filledQuestions.length > 0) {
      try {
        await replaceQuestions(supabase, eventId, filledQuestions);
      } catch {
        // Same best-effort policy as the regular create flow — the event
        // itself already succeeded, questions can be fixed up afterward.
      }
    }
  }

  const guestPhone = canonicalPhone(draft.guestPhone);
  if (draft.guestName.trim() && guestPhone) {
    const trialAllowed = await checkRateLimit(supabase, {
      action: 'quick-start-trial-send',
      scope: user.id,
      maxHits: 3,
      windowSeconds: 60 * 60 * 24 * 365,
    });

    if (trialAllowed) {
      try {
        const guest = await createGuestManually(supabase, eventId, {
          name: draft.guestName,
          phone: guestPhone,
          email: null,
        });
        await sendInvitationWhatsApp(eventSlug, guest.id, guest.name ?? '', guestPhone, locale);
      } catch {
        // Best-effort — the event itself is already created either way.
      }
    }
  }

  revalidatePath(`/${locale}/dashboard/events`);
  redirect(`/${locale}/dashboard/events/${eventId}`);
}
