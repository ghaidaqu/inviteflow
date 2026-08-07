import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { emailProvider } from './index';
import {
  organizerNewRsvpEmail,
  guestRsvpConfirmationEmail,
  organizerTicketPurchasedEmail,
  buyerTicketsEmail,
} from './templates';

type Locale = 'ar' | 'en';

async function getOrganizerContact(
  eventSlug: string,
): Promise<{ email: string; locale: Locale; eventName: string; eventId: string } | null> {
  const admin = createAdminClient();

  const { data: event } = await admin
    .from('events')
    .select('id, name, organization_id')
    .eq('slug', eventSlug)
    .single();
  if (!event) return null;

  const { data: org } = await admin
    .from('organizations')
    .select('owner_id')
    .eq('id', event.organization_id)
    .single();
  if (!org) return null;

  const { data: profile } = await admin
    .from('profiles')
    .select('preferred_locale')
    .eq('id', org.owner_id)
    .single();

  const { data: userRes } = await admin.auth.admin.getUserById(org.owner_id);
  const email = userRes?.user?.email;
  if (!email) return null;

  const locale: Locale = profile?.preferred_locale === 'en' ? 'en' : 'ar';
  return { email, locale, eventName: event.name, eventId: event.id };
}

/** Best-effort — a notification failure must never block the guest/buyer flow. */
async function safeSend(to: string, subject: string, html: string) {
  try {
    await emailProvider.send({ to, subject, html });
  } catch (error) {
    console.error('[email] send failed', error);
  }
}

export async function notifyOrganizerNewRsvp(
  eventSlug: string,
  guestName: string,
  status: 'attending' | 'not_attending' | 'maybe',
) {
  const contact = await getOrganizerContact(eventSlug);
  if (!contact) return;

  const { subject, html } = organizerNewRsvpEmail(contact.locale, {
    eventName: contact.eventName,
    guestName,
    status,
  });
  await safeSend(contact.email, subject, html);
}

export async function sendGuestRsvpConfirmation(
  eventSlug: string,
  guestEmail: string,
  editUrl: string,
  locale: Locale,
) {
  const admin = createAdminClient();
  const { data: event } = await admin.from('events').select('name').eq('slug', eventSlug).single();
  if (!event) return;

  const { subject, html } = guestRsvpConfirmationEmail(locale, {
    eventName: event.name,
    editUrl,
  });
  await safeSend(guestEmail, subject, html);
}

export async function notifyOrganizerTicketPurchase(
  eventSlug: string,
  buyerName: string,
  quantity: number,
) {
  const contact = await getOrganizerContact(eventSlug);
  if (!contact) return;

  const { subject, html } = organizerTicketPurchasedEmail(contact.locale, {
    eventName: contact.eventName,
    buyerName,
    quantity,
  });
  await safeSend(contact.email, subject, html);
}

export async function sendBuyerTickets(
  eventSlug: string,
  buyerEmail: string,
  ticketUrls: string[],
  locale: Locale,
) {
  const admin = createAdminClient();
  const { data: event } = await admin.from('events').select('name').eq('slug', eventSlug).single();
  if (!event) return;

  const { subject, html } = buyerTicketsEmail(locale, { eventName: event.name, ticketUrls });
  await safeSend(buyerEmail, subject, html);
}
