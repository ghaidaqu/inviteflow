import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import QRCode from 'qrcode';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getPublicEventBySlug } from '@/lib/services/events.service';
import { EventPasswordGate } from '@/components/public/event-password-gate';
import { InviteActions } from '@/components/public/invite-actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  if (!isSupabaseConfigured()) notFound();

  const supabase = await createClient();
  const result = await getPublicEventBySlug(supabase, slug);
  if (!result) notFound();

  const { event } = result;

  if (event.password_hash) {
    const cookieStore = await cookies();
    const unlocked = cookieStore.get(`event_unlock_${event.id}`)?.value === '1';
    if (!unlocked) {
      return <EventPasswordGate slug={slug} />;
    }
  }

  const t = await getTranslations('PublicEvent');
  const tTypes = await getTranslations('Events.types');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const publicLink = `${appUrl}/${event.primary_locale}/events/${event.slug}`;
  const qrDataUrl = event.is_qr_enabled ? await QRCode.toDataURL(publicLink, { margin: 1 }) : null;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      {event.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.cover_image_url}
          alt={event.name}
          className="mb-6 aspect-video w-full rounded-xl object-cover"
        />
      )}

      <div className="flex flex-wrap items-start justify-between gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{event.name}</h1>
        <Badge>{tTypes(event.type)}</Badge>
      </div>

      {event.description && (
        <p className="text-muted-foreground mt-4 whitespace-pre-line">{event.description}</p>
      )}

      <dl className="bg-card mt-6 grid gap-4 rounded-xl border p-5 sm:grid-cols-2">
        {event.event_date && (
          <div>
            <dt className="text-muted-foreground text-sm">{t('dateLabel')}</dt>
            <dd className="mt-1">{new Date(event.event_date).toLocaleString(locale)}</dd>
          </div>
        )}
        {event.location_text && (
          <div>
            <dt className="text-muted-foreground text-sm">{t('locationLabel')}</dt>
            <dd className="mt-1">{event.location_text}</dd>
          </div>
        )}
        {event.rsvp_deadline && (
          <div>
            <dt className="text-muted-foreground text-sm">{t('rsvpDeadlineLabel')}</dt>
            <dd className="mt-1">{new Date(event.rsvp_deadline).toLocaleString(locale)}</dd>
          </div>
        )}
      </dl>

      <div className="mt-6 flex flex-wrap gap-2">
        {event.is_rsvp_enabled && (
          <Button
            className="w-full sm:w-fit"
            nativeButton={false}
            render={<Link href={`/events/${event.slug}/rsvp`} />}
          >
            {t('rsvpButton')}
          </Button>
        )}
        {event.is_ticketing_enabled && (
          <Button
            className="w-full sm:w-fit"
            variant="outline"
            nativeButton={false}
            render={<Link href={`/events/${event.slug}/tickets`} />}
          >
            {t('ticketsButton')}
          </Button>
        )}
      </div>

      <div className="mt-6">
        <InviteActions
          eventName={event.name}
          description={event.description}
          locationText={event.location_text}
          locationMapUrl={event.location_map_url}
          eventDate={event.event_date}
          publicLink={publicLink}
        />
      </div>

      {qrDataUrl && (
        <div className="bg-card mt-6 flex flex-col items-center gap-2 rounded-xl border p-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt={event.name} width={160} height={160} />
        </div>
      )}
    </main>
  );
}
