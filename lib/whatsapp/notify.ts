import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { whatsAppProvider, isWhatsAppConfigured } from './index';
import { generateAndUploadQr } from '@/lib/services/qr.service';
import type { ResultsSummary } from '@/lib/services/results.service';

type Locale = 'ar' | 'en';

async function safeSend(to: string, text: string) {
  try {
    await whatsAppProvider.send({ to, text });
  } catch (error) {
    console.error('[whatsapp] send failed', error);
  }
}

async function getEventName(eventSlug: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.from('events').select('name').eq('slug', eventSlug).single();
  return data?.name ?? null;
}

export async function sendGuestRsvpConfirmationWhatsApp(
  eventSlug: string,
  phone: string,
  status: 'attending' | 'not_attending',
  editUrl: string,
  locale: Locale,
) {
  const eventName = await getEventName(eventSlug);
  if (!eventName) return;

  const statusText =
    locale === 'ar'
      ? { attending: 'سيحضر', not_attending: 'لن يحضر' }[status]
      : { attending: 'Attending', not_attending: 'Not attending' }[status];

  const text =
    locale === 'ar'
      ? `تم استلام ردك على دعوة "${eventName}": ${statusText}. لتعديل ردك لاحقًا: ${editUrl}`
      : `Your RSVP for "${eventName}" was received: ${statusText}. To edit it later: ${editUrl}`;

  await safeSend(phone, text);
}

/**
 * Organizer-triggered "send this guest their invitation" — unlike the
 * other notify* functions here (best-effort, fire-and-forget from a public
 * action), this is an explicit click from the dashboard, so it reports
 * back whether it actually sent instead of silently swallowing failures.
 *
 * This is "الدعوة الرقمية" (digital invitation) done right per how guests
 * actually behave: nobody visits a website just to tap "accept" — when the
 * event has RSVP enabled, the message carries tappable reply buttons
 * (Accept/Decline) so the guest can respond without ever leaving
 * WhatsApp. The tap comes back via app/api/webhooks/whatsapp/route.ts. If
 * RSVP is off (a pure announcement, per the organizer's choice), this is
 * just an informational message with the event link and no buttons.
 */
export async function sendInvitationWhatsApp(
  eventSlug: string,
  guestId: string,
  guestName: string,
  phone: string,
  locale: Locale,
): Promise<{ ok: boolean; configured: boolean }> {
  if (!isWhatsAppConfigured()) return { ok: false, configured: false };

  const admin = createAdminClient();
  const { data: event } = await admin
    .from('events')
    .select('name, is_rsvp_enabled, event_settings(allow_attending, allow_not_attending)')
    .eq('slug', eventSlug)
    .single();
  if (!event) return { ok: false, configured: true };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const link = `${appUrl}/${locale}/events/${eventSlug}`;

  if (!event.is_rsvp_enabled) {
    // Pure announcement — no response expected, so no buttons.
    const text =
      locale === 'ar'
        ? `مرحبًا ${guestName}! أنت مدعو لـ "${event.name}". التفاصيل: ${link}`
        : `Hi ${guestName}! You're invited to "${event.name}". Details: ${link}`;
    try {
      await whatsAppProvider.send({ to: phone, text });
      return { ok: true, configured: true };
    } catch (error) {
      console.error('[whatsapp] invitation send failed', error);
      return { ok: false, configured: true };
    }
  }

  const settings = event.event_settings as unknown as {
    allow_attending: boolean;
    allow_not_attending: boolean;
  } | null;

  const buttons: { id: string; title: string }[] = [];
  if (settings?.allow_attending !== false) {
    buttons.push({
      id: `rsvp_accept:${guestId}`,
      title: locale === 'ar' ? 'موافق' : 'Accept',
    });
  }
  if (settings?.allow_not_attending !== false) {
    buttons.push({
      id: `rsvp_decline:${guestId}`,
      title: locale === 'ar' ? 'اعتذار' : 'Decline',
    });
  }

  const text =
    locale === 'ar'
      ? `مرحبًا ${guestName}! أنت مدعو لـ "${event.name}". رد على الدعوة مباشرة من هنا:\n\nالتفاصيل: ${link}`
      : `Hi ${guestName}! You're invited to "${event.name}". Respond right here:\n\nDetails: ${link}`;

  try {
    await whatsAppProvider.send({ to: phone, text, buttons });
    return { ok: true, configured: true };
  } catch (error) {
    console.error('[whatsapp] invitation send failed', error);
    return { ok: false, configured: true };
  }
}

/**
 * Sent once a guest's response becomes 'attending' on an event with entry
 * QR enabled — every caller is responsible for only calling this on a
 * genuine new acceptance (see the previous_status guards in rsvp.ts and
 * the WhatsApp webhook route), not on a repeat confirmation of a status
 * that was already 'attending'.
 *
 * The QR encodes the guest's own RSVP link (the same one already sent in
 * the ordinary confirmation message) rather than inventing a separate
 * "entry pass" page — that link already shows their name and status, so
 * scanning it is a real, working thing to do with no new infrastructure.
 * Best-effort: a failed QR send never fails the RSVP itself.
 */
export async function sendGuestQrWhatsApp(
  eventName: string,
  guestId: string,
  guestName: string,
  phone: string,
  editUrl: string,
  locale: Locale,
): Promise<void> {
  const qrUrl = await generateAndUploadQr(`guest-${guestId}`, editUrl);
  if (!qrUrl) return;

  const caption =
    locale === 'ar'
      ? `رمز دخولك لـ "${eventName}" يا ${guestName} — أظهره عند الوصول.`
      : `Your entry QR for "${eventName}", ${guestName} — show it when you arrive.`;

  try {
    await whatsAppProvider.send({ to: phone, text: caption, imageUrl: qrUrl });
  } catch (error) {
    console.error('[whatsapp] QR send failed', error);
  }
}

function summaryText(locale: Locale, summary: ResultsSummary): string {
  const rsvpLine =
    locale === 'ar'
      ? `سيحضر: ${summary.attendingCount} — لن يحضر: ${summary.notAttendingCount}`
      : `Attending: ${summary.attendingCount} — Not attending: ${summary.notAttendingCount}`;

  const questionLines = summary.questions
    .filter((q) => q.tally)
    .map((q) => {
      const text = locale === 'ar' ? q.questionTextAr : (q.questionTextEn ?? q.questionTextAr);
      const options = q
        .tally!.map((t) => `  - ${locale === 'ar' ? t.labelAr : t.labelEn}: ${t.count}`)
        .join('\n');
      return `${text}\n${options}`;
    })
    .join('\n\n');

  return questionLines ? `${rsvpLine}\n\n${questionLines}` : rsvpLine;
}

/** Organizer-triggered broadcast of aggregate results to a guest. Reports
 * success/failure back — see sendInvitationWhatsApp for why. */
export async function sendResultsBroadcastWhatsApp(
  eventSlug: string,
  phone: string,
  summary: ResultsSummary,
  locale: Locale,
): Promise<boolean> {
  if (!isWhatsAppConfigured()) return false;
  const eventName = await getEventName(eventSlug);
  if (!eventName) return false;

  const text =
    locale === 'ar'
      ? `نتيجة الردود على "${eventName}":\n\n${summaryText(locale, summary)}`
      : `Results for "${eventName}":\n\n${summaryText(locale, summary)}`;

  try {
    await whatsAppProvider.send({ to: phone, text });
    return true;
  } catch (error) {
    console.error('[whatsapp] results broadcast failed', error);
    return false;
  }
}
