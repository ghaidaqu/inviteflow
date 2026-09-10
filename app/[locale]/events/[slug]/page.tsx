import { cache } from 'react';
import type { Metadata } from 'next';
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
 * A missing token/slug renders the correct not-found page but answers
 * HTTP 200 rather than 404 — a soft 404, still unfixed.
 *
 * notFound() is called correctly and the page a guest sees is right
 * (verified in a browser). The status is committed before notFound()
 * runs. Already ruled out: `export const dynamic = 'force-dynamic'` on
 * this route, and a root app/not-found.tsx — that one renders its own
 * <html> inside this segment's layout, so don't.
 *
 * The cost is SEO only, on links that are private and should not be
 * indexed. Worth another look, but not by repeating either of those.
 */
/**
 * Looked up once per request and shared with the page below — React's
 * cache() dedupes it, so adding generateMetadata does not double every
 * public event page's database work.
 */
const loadEvent = cache(async (rawSlug: string) => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  return getPublicEventBySlug(supabase, decodeURIComponent(rawSlug));
});

/**
 * This exists as much for the status code as for the tags.
 *
 * These pages are rendered on demand, so by the time the page component
 * ran and called notFound(), the shell had already begun streaming and
 * the 200 was committed — a missing event answered 404-the-page with
 * 200-the-status, which tells a crawler the URL is real. generateMetadata
 * runs before any of that, so notFound() here sets the status for real.
 * Confirmed against production, where a genuinely missing path
 * (prerendered) returned 404 while a missing event returned 200.
 *
 * The tags themselves were worth having anyway: every event page used to
 * report the site's own default title.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadEvent(slug);
  if (!result) notFound();

  const { event } = result;
  const description = event.description?.slice(0, 160) || undefined;
  return {
    title: event.name,
    description,
    openGraph: {
      title: event.name,
      description,
      images: event.cover_image_url ? [event.cover_image_url] : undefined,
    },
  };
}

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug: rawSlug } = await params;
  setRequestLocale(locale);

  // Confirmed directly in production: a non-ASCII slug (any Arabic event
  // name, since generateUniqueSlug() only transliterates spaces to
  // hyphens and otherwise keeps the name's own script) arrives here still
  // percent-encoded — e.g. literally the string "%D9%86", not the decoded
  // "ن" — even though the exact same query with the real decoded value
  // matches a row fine. Decoding happens inside loadEvent above; it is a
  // no-op for an already-decoded ASCII slug and fixes the Arabic case.
  const slug = decodeURIComponent(rawSlug);
  const result = await loadEvent(rawSlug);
  if (!result) notFound();

  const { event, settings, design, hasPassword } = result;

  if (hasPassword) {
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
