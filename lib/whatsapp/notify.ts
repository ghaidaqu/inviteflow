import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { whatsAppProvider, isWhatsAppConfigured } from './index';
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
  status: 'attending' | 'not_attending' | 'maybe',
  editUrl: string,
  locale: Locale,
) {
  const eventName = await getEventName(eventSlug);
  if (!eventName) return;

  const statusText =
    locale === 'ar'
      ? { attending: 'سيحضر', not_attending: 'لن يحضر', maybe: 'ربما' }[status]
      : { attending: 'Attending', not_attending: 'Not attending', maybe: 'Maybe' }[status];

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
 */
export async function sendInvitationWhatsApp(
  eventSlug: string,
  guestName: string,
  phone: string,
  locale: Locale,
): Promise<{ ok: boolean; configured: boolean }> {
  if (!isWhatsAppConfigured()) return { ok: false, configured: false };

  const eventName = await getEventName(eventSlug);
  if (!eventName) return { ok: false, configured: true };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const link = `${appUrl}/${locale}/events/${eventSlug}`;
  const text =
    locale === 'ar'
      ? `مرحبًا ${guestName}! أنت مدعو لـ "${eventName}". شوف التفاصيل ورد على الدعوة من هنا: ${link}`
      : `Hi ${guestName}! You're invited to "${eventName}". See the details and respond here: ${link}`;

  try {
    await whatsAppProvider.send({ to: phone, text });
    return { ok: true, configured: true };
  } catch (error) {
    console.error('[whatsapp] invitation send failed', error);
    return { ok: false, configured: true };
  }
}

function summaryText(locale: Locale, summary: ResultsSummary): string {
  const rsvpLine =
    locale === 'ar'
      ? `سيحضر: ${summary.attendingCount} — لن يحضر: ${summary.notAttendingCount} — ربما: ${summary.maybeCount}`
      : `Attending: ${summary.attendingCount} — Not attending: ${summary.notAttendingCount} — Maybe: ${summary.maybeCount}`;

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

export async function sendBuyerTicketsWhatsApp(
  eventSlug: string,
  phone: string,
  ticketUrls: string[],
  locale: Locale,
) {
  const eventName = await getEventName(eventSlug);
  if (!eventName) return;

  const text =
    locale === 'ar'
      ? `شكرًا لشرائك تذاكر "${eventName}"! روابط تذاكرك:\n${ticketUrls.join('\n')}`
      : `Thanks for your tickets to "${eventName}"! Your ticket links:\n${ticketUrls.join('\n')}`;

  await safeSend(phone, text);
}
