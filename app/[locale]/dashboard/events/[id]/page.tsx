import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentOrganizationId, getEvent } from '@/lib/services/events.service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EventDetailActions } from '@/components/dashboard/event-detail-actions';
import { CopyLinkButton } from '@/components/dashboard/copy-link-button';
import { Link } from '@/i18n/navigation';
import {
  UsersIcon,
  MailIcon,
  CheckCircle2Icon,
  TicketIcon,
  QrCodeIcon,
  type LucideIcon,
} from 'lucide-react';

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

      <div className="mt-6">
        <EventDetailActions eventId={event.id} status={event.status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <ToolCard
          href={`/dashboard/events/${event.id}/guests`}
          icon={UsersIcon}
          label={t('detail.guestsButton')}
        />
        <ToolCard
          href={`/dashboard/events/${event.id}/invitation`}
          icon={MailIcon}
          label={t('detail.invitationButton')}
        />
        <ToolCard
          href={`/dashboard/events/${event.id}/rsvp`}
          icon={CheckCircle2Icon}
          label={t('detail.rsvpSettingsButton')}
        />
        <ToolCard
          href={`/dashboard/events/${event.id}/tickets`}
          icon={TicketIcon}
          label={t('detail.ticketsButton')}
        />
        <ToolCard
          href={`/dashboard/events/${event.id}/check-in`}
          icon={QrCodeIcon}
          label={t('detail.checkInButton')}
        />
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

      <dl className="bg-card mt-6 grid gap-4 rounded-2xl border p-5 sm:grid-cols-2">
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

function ToolCard({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link
      href={href}
      className="bg-card hover:border-primary/40 group flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-[color,background-color,border-color,transform] duration-150 ease-out hover:-translate-y-0.5"
    >
      <div className="bg-primary/10 text-primary group-hover:bg-primary/15 flex size-10 items-center justify-center rounded-full transition-colors">
        <Icon className="size-4.5" />
      </div>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
