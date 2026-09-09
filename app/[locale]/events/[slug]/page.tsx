import { notFound } from 'next/navigation';
import { formatDateTime } from '@/lib/utils/format-date';
import { cookies } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getPublicEventBySlug } from '@/lib/services/events.service';
import { generateAndUploadShareCard } from '@/lib/services/qr.service';
import { EventPasswordGate } from '@/components/public/event-password-gate';
import { InviteActions } from '@/components/public/invite-actions';
import { EventHero } from '@/components/public/event-hero/event-hero';
import { GuestFooter } from '@/components/public/guest-footer';
import { SiteNav } from '@/components/marketing/site-nav';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { CalendarIcon, MapPinIcon, ClockIcon } from 'lucide-react';

/**
 * Never cached. Both because a guest's page must reflect the event and
 * their own response as they stand right now, and because without this a
 * request for a slug/token that does not exist was answered from a
 * prerendered shell with HTTP 200 — a soft 404, which search engines
 * index as a real page. `notFound()` was being called correctly; the
 * status was set before it ran.
 */
export const dynamic = 'force-dynamic';

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug: rawSlug } = await params;
  setRequestLocale(locale);

  if (!isSupabaseConfigured()) notFound();

  const supabase = await createClient();
  // Confirmed directly in production: a non-ASCII slug (any Arabic event
  // name, since generateUniqueSlug() only transliterates spaces to
  // hyphens and otherwise keeps the name's own script) arrives here still
  // percent-encoded — e.g. literally the string "%D9%86", not the decoded
  // "ن" — even though the exact same query with the real decoded value
  // matches a row fine (checked directly against both the anon and
  // service-role clients). Something upstream of this page (next-intl's
  // middleware rewrite, most likely) isn't decoding the dynamic segment
  // the way Next.js normally does for an ASCII slug. Decoding here is a
  // no-op for an already-decoded ASCII slug and fixes the Arabic case
  // either way, without needing to chase the exact upstream cause.
  const slug = decodeURIComponent(rawSlug);
  const result = await getPublicEventBySlug(supabase, slug);
  if (!result) notFound();

  const { event, settings, design } = result;

  if (event.password_hash) {
    const cookieStore = await cookies();
    const unlocked = cookieStore.get(`event_unlock_${event.id}`)?.value === '1';
    if (!unlocked) {
      return (
        <>
          <SiteNav />
          <EventPasswordGate slug={slug} />
        </>
      );
    }
  }

  const t = await getTranslations('PublicEvent');
  const tTypes = await getTranslations('Events.types');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const publicLink = `${appUrl}/${event.primary_locale}/events/${event.slug}`;
  const qrCardUrl = event.is_qr_enabled
    ? await generateAndUploadShareCard(`event-${event.id}`, publicLink)
    : null;

  return (
    <>
      <SiteNav />
      <main className="flex-1">
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
                value={formatDateTime(event.event_date, locale)}
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
                value={formatDateTime(event.rsvp_deadline, locale)}
              />
            )}
          </dl>

          <div className="mt-6 flex flex-wrap gap-2">
            {/* Neither is_rsvp_enabled alone nor the two allow_* flags alone
              are enough — an event created before this distinction existed
              (or edited to turn both response options off) can have
              is_rsvp_enabled=true with nothing a guest could actually
              submit. Both conditions together are what "there's a real
              response to give" means. */}
            {event.is_rsvp_enabled &&
              (settings.allow_attending || settings.allow_not_attending) && (
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

          {qrCardUrl && (
            <div className="mt-6 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCardUrl}
                alt={t('shareQrAlt')}
                className="w-full max-w-56 rounded-2xl shadow-sm"
              />
            </div>
          )}

          <GuestFooter />
        </div>
      </main>
    </>
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
