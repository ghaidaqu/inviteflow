import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { whatsAppProvider } from './index';

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
