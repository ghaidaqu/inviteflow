import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentOrganizationId, getEvent } from '@/lib/services/events.service';
import { EventForm } from '@/components/dashboard/event-form';
import { eventHasPassword } from '@/lib/services/event-secrets.service';
import { updateEventAction } from '@/lib/actions/events';
import { Link } from '@/i18n/navigation';

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Events.form');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const organizationId = await getCurrentOrganizationId(supabase, user.id);
  const event = organizationId ? await getEvent(supabase, organizationId, id) : null;
  if (!event) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      {/* Same breadcrumb-back pattern the other event subpages use — without
          it this form was a dead end with no way back to the event. */}
      <Link
        href={`/dashboard/events/${id}`}
        className="text-muted-foreground hover:text-primary text-sm hover:underline"
      >
        {event.name}
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-bold tracking-tight">{t('submitEdit')}</h1>
      <EventForm
        event={event}
        hasPassword={await eventHasPassword(event.id)}
        action={updateEventAction.bind(null, event.id)}
      />
    </main>
  );
}
