import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import {
  getCurrentOrganizationId,
  getEvent,
  getEventSettings,
} from '@/lib/services/events.service';
import { EventSettingsForm } from '@/components/dashboard/event-settings-form';
import { Link } from '@/i18n/navigation';

// "الدعوة الرقمية" — a lightweight, personal invitation to an occasion:
// does the organizer even need a response, and if so a simple
// accept/decline. This is deliberately separate from /rsvp (the
// question/poll-based tool for organizing an event) — see EventSettings
// translations and the RSVP page for that distinction.
export default async function EventInvitationSettingsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('EventSettings');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const organizationId = await getCurrentOrganizationId(supabase, user.id);
  const event = organizationId ? await getEvent(supabase, organizationId, id) : null;
  if (!event) notFound();

  const settings = await getEventSettings(supabase, id);
  if (!settings) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <Link
        href={`/dashboard/events/${id}`}
        className="text-muted-foreground hover:text-primary text-sm hover:underline"
      >
        {event.name}
      </Link>
      <h1 className="mt-2 mb-1 text-2xl font-bold tracking-tight">{t('invitationPageTitle')}</h1>
      <p className="text-muted-foreground mb-6">{t('invitationPageSubtitle')}</p>

      <div className="bg-card rounded-xl border p-5">
        <EventSettingsForm eventId={id} settings={settings} />
      </div>
    </main>
  );
}
