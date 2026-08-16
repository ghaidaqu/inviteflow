import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { emailProvider, isEmailConfigured } from './index';
import {
  organizerNewRsvpEmail,
  guestRsvpConfirmationEmail,
  resultsBroadcastEmail,
} from './templates';
import type { ResultsSummary } from '@/lib/services/results.service';

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

/** Organizer-triggered broadcast — reports success so the dashboard can
 * show an accurate "sent to N of M guests" count instead of a blind
 * best-effort fire-and-forget. */
export async function sendResultsBroadcastEmail(
  eventName: string,
  guestEmail: string,
  summary: ResultsSummary,
  locale: Locale,
): Promise<boolean> {
  if (!isEmailConfigured()) return false;

  const { subject, html } = resultsBroadcastEmail(locale, { eventName, summary });
  try {
    await emailProvider.send({ to: guestEmail, subject, html });
    return true;
  } catch (error) {
    console.error('[email] results broadcast failed', error);
    return false;
  }
}
