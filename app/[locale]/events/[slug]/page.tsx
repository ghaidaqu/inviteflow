import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import QRCode from 'qrcode';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getPublicEventBySlug } from '@/lib/services/events.service';
import { EventPasswordGate } from '@/components/public/event-password-gate';
import { InviteActions } from '@/components/public/invite-actions';
import { EventHero } from '@/components/public/event-hero/event-hero';
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

  const { event, design } = result;

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
        <EventHero
          event={event}
          template={design.template}
          typeLabel={tTypes(event.type)}
          organizedByLabel={
            event.organization_name ? t('organizedBy', { name: event.organization_name }) : null
          }
        />

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
