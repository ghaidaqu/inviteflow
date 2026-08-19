'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import {
  getCurrentOrganizationId,
  createEvent,
  getEventSettings,
  updateEventSettings,
} from '@/lib/services/events.service';
import { createGuestManually } from '@/lib/services/guests.service';
import { replaceQuestions } from '@/lib/services/questions.service';
import { sendInvitationWhatsApp } from '@/lib/whatsapp/notify';
import { normalizePhone } from '@/lib/utils/phone';
import { normalizeDigits } from '@/lib/utils/digits';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { eventTypes, eventLocales, eventVisibilities } from '@/lib/validations/events';
import type { QuestionInput } from '@/lib/validations/questions';

/**
 * Exactly the fields the authenticated dashboard's EventForm has, plus
 * the response-option/QR toggles that live in event settings — see
 * event-form.tsx and event-settings-form.tsx for the reference: name,
 * type, description, eventDate, rsvpDeadline, locationText,
 * locationMapUrl, coverImageUrl, primaryLocale, visibility,
 * isQrEnabled, allowAttending/allowNotAttending — plus custom
 * questions for the Link track. eventEndDate isn't here because the
 * real form doesn't expose it either (it round-trips silently there
 * too); institutional fields aren't here because Institutional isn't
 * part of this flow. Password protection isn't offered in this quick
 * flow either — it's still a real event setting, just not one worth
 * asking about before someone has even tried the product; organizers
 * who want it can turn it on later from the dashboard.
 *
 * guestName/guestPhone only apply to the 'invitation' track — a Digital
 * Invitation is sent to one guest at a time, so testing it means sending
 * a real one. The Link track has no equivalent: it's a single public URL
 * the organizer shares themselves (to a WhatsApp group, typically), and
 * everyone who's coming opens it and registers their own name and phone
 * — there's no "test guest" to name up front.
 */
export type QuickStartDraft = {
  track: 'invitation' | 'rsvp';
  name: string;
  type: string;
  description: string;
  eventDate: string;
  rsvpDeadline: string;
  locationText: string;
  locationMapUrl: string;
  coverImageUrl: string;
  primaryLocale: string;
  visibility: string;
  isQrEnabled: boolean;
  allowAttending: boolean;
  allowNotAttending: boolean;
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

function toIsoOrUndefined(value: string): string | undefined {
  if (!value || Number.isNaN(Date.parse(value))) return undefined;
  return new Date(value).toISOString();
}

/**
 * The only place in the whole /start flow that writes to the database —
 * called directly from the wizard's last step (the organizer is already
 * authenticated by the time they reach the wizard at all, see
 * app/[locale]/start/[track]/page.tsx's auth guard). Creates the real
 * event with everything the organizer filled in, then — if `sendTrial`
 * is true and they gave a test contact — adds that guest and sends them
 * the actual invitation (real Accept/Decline buttons, real QR), exactly
 * what a guest would get. This *is* the free trial; there's no separate
 * lightweight preview message. The wizard's "اعتماد" action calls this
 * with `sendTrial: false` for someone who wants the event created
 * without a test send.
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
  options?: { sendTrial?: boolean },
): Promise<QuickStartResult> {
  const sendTrial = options?.sendTrial ?? true;
  if (!draft.name.trim() || draft.name.length > 150) return { error: 'invalidInput' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthorized' };

  const organizationId = await getCurrentOrganizationId(supabase, user.id);
  if (!organizationId) return { error: 'unknown' };

  const uiLocale = (await getLocale()) as 'ar' | 'en';
  const eventType = (eventTypes as readonly string[]).includes(draft.type) ? draft.type : 'other';
  const primaryLocale = (eventLocales as readonly string[]).includes(draft.primaryLocale)
    ? draft.primaryLocale
    : 'ar';
  const visibility = (eventVisibilities as readonly string[]).includes(draft.visibility)
    ? draft.visibility
    : 'private';
  let eventId: string;
  let eventSlug: string;
  try {
    const event = await createEvent(supabase, organizationId, user.id, {
      name: draft.name,
      type: eventType as (typeof eventTypes)[number],
      description: draft.description || undefined,
      eventDate: toIsoOrUndefined(draft.eventDate),
      rsvpDeadline: toIsoOrUndefined(draft.rsvpDeadline),
      locationText: draft.locationText || undefined,
      locationMapUrl: draft.locationMapUrl || undefined,
      coverImageUrl: draft.coverImageUrl || undefined,
      primaryLocale: primaryLocale as (typeof eventLocales)[number],
      visibility: visibility as (typeof eventVisibilities)[number],
      // Neither response option enabled means the organizer doesn't want
      // RSVP tracking at all for this invite — an announcement, not a
      // request for a reply. Guest-facing pages already hide the RSVP
      // option whenever both are off (see events/[slug]/page.tsx), so
      // this just keeps is_rsvp_enabled honest with that reality from
      // the start instead of always forcing it on.
      isRsvpEnabled: draft.allowAttending || draft.allowNotAttending,
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

  // event_settings is auto-created by a DB trigger with its own defaults
  // (both response options on) the moment the event row is inserted
  // above — only touch it if the organizer actually changed something,
  // preserving the trigger's defaults for every other setting.
  if (!draft.allowAttending || !draft.allowNotAttending) {
    try {
      const settings = await getEventSettings(supabase, eventId);
      if (settings) {
        await updateEventSettings(supabase, eventId, {
          allowAttending: draft.allowAttending,
          allowNotAttending: draft.allowNotAttending,
          collectCompanions: settings.collect_companions,
          maxCompanions: settings.max_companions,
          collectMessage: settings.collect_message,
          allowGuestEdit: settings.allow_guest_edit,
        });
      }
    } catch {
      // Best-effort, same policy as everything else in this flow — the
      // event exists either way and settings can be fixed from the
      // dashboard afterward.
    }
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

  // Trial send only applies to the 'invitation' track — a Digital
  // Invitation goes out to one named guest, so a real test send needs a
  // real test guest. The Link track has no per-guest send at all: the
  // organizer gets one public link (already shown on the dashboard page
  // this redirects to) and shares it themselves; everyone who opens it
  // registers their own name and phone.
  const guestPhone = draft.track === 'invitation' ? canonicalPhone(draft.guestPhone) : null;
  if (sendTrial && draft.track === 'invitation' && draft.guestName.trim() && guestPhone) {
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
        await sendInvitationWhatsApp(eventSlug, guest.id, guest.name ?? '', guestPhone, uiLocale);
      } catch {
        // Best-effort — the event itself is already created either way.
      }
    }
  }

  revalidatePath(`/${uiLocale}/dashboard/events`);
  redirect(`/${uiLocale}/dashboard/events/${eventId}`);
}
