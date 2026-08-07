import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentOrganizationId, getEvent } from '@/lib/services/events.service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EventDetailActions } from '@/components/dashboard/event-detail-actions';
import { CopyLinkButton } from '@/components/dashboard/copy-link-button';
import { Link } from '@/i18n/navigation';

const STATUS_VARIANT = {
  draft: 'secondary',
  published: 'default',
  ended: 'outline',
} as const;

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Events');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const organizationId = await getCurrentOrganizationId(supabase, user.id);
  const event = organizationId ? await getEvent(supabase, organizationId, id) : null;
  if (!event) notFound();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const publicLink = `${appUrl}/${event.primary_locale}/events/${event.slug}`;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <Link
        href="/dashboard/events"
        className="text-muted-foreground hover:text-primary text-sm hover:underline"
      >
        {t('detail.backToList')}
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{event.name}</h1>
            <Badge variant={STATUS_VARIANT[event.status]}>{t(`statuses.${event.status}`)}</Badge>
          </div>
          <p className="text-muted-foreground mt-1">{t(`types.${event.type}`)}</p>
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={`/dashboard/events/${event.id}/edit`} />}
        >
          {t('detail.editButton')}
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <EventDetailActions eventId={event.id} status={event.status} />
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={`/dashboard/events/${event.id}/guests`} />}
        >
          {t('detail.guestsButton')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={`/dashboard/events/${event.id}/invitation`} />}
        >
          {t('detail.invitationButton')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={`/dashboard/events/${event.id}/rsvp`} />}
        >
          {t('detail.rsvpSettingsButton')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={`/dashboard/events/${event.id}/tickets`} />}
        >
          {t('detail.ticketsButton')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={`/dashboard/events/${event.id}/check-in`} />}
        >
          {t('detail.checkInButton')}
        </Button>
      </div>

      {event.status === 'published' && event.visibility === 'public' && (
        <div className="bg-card mt-6 flex flex-wrap items-center gap-2 rounded-xl border p-4">
          <span className="text-sm font-medium">{t('detail.publicLinkLabel')}:</span>
          <a
            href={publicLink}
            target="_blank"
            rel="noreferrer"
            className="text-primary truncate text-sm underline-offset-4 hover:underline"
          >
            {publicLink}
          </a>
          <CopyLinkButton link={publicLink} />
        </div>
      )}

      <dl className="bg-card mt-6 grid gap-4 rounded-xl border p-5 sm:grid-cols-2">
        {event.description && (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground text-sm">{t('form.descriptionLabel')}</dt>
            <dd className="mt-1">{event.description}</dd>
          </div>
        )}
        {event.event_date && (
          <div>
            <dt className="text-muted-foreground text-sm">{t('form.eventDateLabel')}</dt>
            <dd className="mt-1">{new Date(event.event_date).toLocaleString(locale)}</dd>
          </div>
        )}
        {event.rsvp_deadline && (
          <div>
            <dt className="text-muted-foreground text-sm">{t('form.rsvpDeadlineLabel')}</dt>
            <dd className="mt-1">{new Date(event.rsvp_deadline).toLocaleString(locale)}</dd>
          </div>
        )}
        {event.location_text && (
          <div>
            <dt className="text-muted-foreground text-sm">{t('form.locationTextLabel')}</dt>
            <dd className="mt-1">{event.location_text}</dd>
          </div>
        )}
      </dl>
    </main>
  );
}
