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
import { CalendarIcon, MapPinIcon, ClockIcon } from 'lucide-react';

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
    <main className="relative flex-1 overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="bg-primary/15 absolute start-[-15%] top-[-10%] size-[30rem] rounded-full blur-3xl" />
        <div className="bg-accent/25 absolute end-[-10%] top-[20%] size-[22rem] rounded-full blur-3xl" />
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto w-full max-w-2xl px-4 py-10 duration-700 sm:px-6">
        {(event.organization_name || event.organization_logo_url) && (
          <div className="mb-4 flex items-center justify-center gap-2 sm:justify-start">
            {event.organization_logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.organization_logo_url}
                alt=""
                className="bg-card size-8 rounded-full border object-contain p-1"
              />
            )}
            {event.organization_name && (
              <span className="text-muted-foreground text-sm font-medium">
                {t('organizedBy', { name: event.organization_name })}
              </span>
            )}
          </div>
        )}

        {event.cover_image_url ? (
          /\.(mp4|webm|mov)$/i.test(event.cover_image_url) ? (
            <video
              src={event.cover_image_url}
              className="mb-6 aspect-video w-full rounded-2xl object-cover shadow-lg"
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.cover_image_url}
              alt={event.name}
              className="mb-6 aspect-video w-full rounded-2xl object-cover shadow-lg"
            />
          )
        ) : (
          <div className="from-primary/15 via-accent/20 to-primary/10 mb-6 flex aspect-[2/1] w-full flex-col items-center justify-center rounded-2xl bg-gradient-to-br p-6 text-center shadow-sm">
            <Badge className="mb-3">{tTypes(event.type)}</Badge>
            <h1 className="text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
              {event.name}
            </h1>
          </div>
        )}

        {event.cover_image_url && (
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight">{event.name}</h1>
            <Badge>{tTypes(event.type)}</Badge>
          </div>
        )}

        {event.description && (
          <p className="text-muted-foreground mt-4 text-center whitespace-pre-line sm:text-start">
            {event.description}
          </p>
        )}

        <dl className="mt-6 grid gap-3 sm:grid-cols-2">
          {event.event_date && (
            <DetailCard
              icon={<CalendarIcon className="size-5" />}
              label={t('dateLabel')}
              value={new Date(event.event_date).toLocaleString(locale)}
            />
          )}
          {event.location_text && (
            <DetailCard
              icon={<MapPinIcon className="size-5" />}
              label={t('locationLabel')}
              value={event.location_text}
            />
          )}
          {event.rsvp_deadline && (
            <DetailCard
              icon={<ClockIcon className="size-5" />}
              label={t('rsvpDeadlineLabel')}
              value={new Date(event.rsvp_deadline).toLocaleString(locale)}
            />
          )}
        </dl>

        <div className="mt-6 flex flex-wrap gap-2">
          {event.is_rsvp_enabled && (
            <Button
              size="lg"
              className="shadow-primary/20 w-full shadow-lg transition-transform hover:-translate-y-0.5 sm:w-fit"
              nativeButton={false}
              render={<Link href={`/events/${event.slug}/rsvp`} />}
            >
              {t('rsvpButton')}
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
          <div className="bg-card mt-6 flex flex-col items-center gap-2 rounded-2xl border p-5 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt={event.name} width={160} height={160} />
          </div>
        )}
      </div>
    </main>
  );
}

function DetailCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-card flex items-start gap-3 rounded-xl border p-4 shadow-sm">
      <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full">
        {icon}
      </div>
      <div>
        <dt className="text-muted-foreground text-xs">{label}</dt>
        <dd className="mt-0.5 text-sm font-medium">{value}</dd>
      </div>
    </div>
  );
}
