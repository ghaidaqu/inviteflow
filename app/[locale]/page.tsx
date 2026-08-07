import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { MailIcon, ListChecksIcon, TicketIcon, SparklesIcon, CalendarIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { listPublicTicketedEvents } from '@/lib/services/events.service';
import type { Database } from '@/types/supabase';

type EventRow = Database['public']['Tables']['events']['Row'];

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Public ticketed events belong on the homepage itself — anonymous
  // visitors should be able to find and book them without logging in or
  // already knowing the event's direct link.
  let events: EventRow[] = [];
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    events = await listPublicTicketedEvents(supabase);
  }

  return (
    <>
      <HomeContent />
      {events.length > 0 && <PublicEventsSection events={events} locale={locale} />}
    </>
  );
}

function HomeContent() {
  const t = useTranslations('HomePage');

  return (
    <main className="relative flex flex-col overflow-hidden">
      {/* Decorative gradient backdrop — pure CSS, no images/assets needed. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="bg-primary/25 absolute start-[-10%] top-[-15%] size-[32rem] rounded-full blur-3xl" />
        <div className="bg-accent/35 absolute end-[-15%] top-[10%] size-[28rem] rounded-full blur-3xl" />
        <div className="bg-primary/10 absolute start-[20%] bottom-[-20%] size-[36rem] rounded-full blur-3xl" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-20 text-center">
        <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-col items-center gap-4 duration-700">
          <span className="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium">
            <SparklesIcon className="size-4" />
            {t('badge')}
          </span>
          <h1 className="max-w-2xl text-5xl font-extrabold tracking-tight text-balance sm:text-6xl">
            {t('title')}
          </h1>
          <p className="text-muted-foreground max-w-md text-lg text-balance">{t('subtitle')}</p>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 flex gap-3 delay-150 duration-700">
          <Button
            size="lg"
            className="shadow-primary/20 shadow-lg transition-transform hover:-translate-y-0.5"
            nativeButton={false}
            render={<Link href="/register" />}
          >
            {t('cta')}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="transition-transform hover:-translate-y-0.5"
            nativeButton={false}
            render={<Link href="/login" />}
          >
            {t('login')}
          </Button>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 mt-2 flex flex-col items-center gap-1.5 delay-300 duration-700">
          <Button size="lg" variant="ghost" nativeButton={false} render={<Link href="/guest" />}>
            {t('guestCta')}
          </Button>
          <p className="text-muted-foreground text-sm">{t('guestHint')}</p>
        </div>

        <div className="animate-in fade-in mt-6 grid w-full max-w-3xl gap-4 delay-500 duration-700 sm:grid-cols-3">
          <FeatureCard icon={<MailIcon className="size-5" />} label={t('feature1')} />
          <FeatureCard icon={<ListChecksIcon className="size-5" />} label={t('feature2')} />
          <FeatureCard icon={<TicketIcon className="size-5" />} label={t('feature3')} />
        </div>
      </div>
    </main>
  );
}

// Each card mirrors one of the three fully-separate creation tracks
// (Digital Invitation / RSVP-poll / Ticketed Event — see dashboard/events/new)
// and links straight into starting one, instead of sitting as inert copy.
function FeatureCard({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <Link
      href="/register"
      className="bg-card/70 hover:border-primary/40 group flex flex-col items-center gap-2 rounded-2xl border p-5 backdrop-blur-sm transition-[color,background-color,border-color,transform] duration-150 ease-out hover:-translate-y-0.5 active:scale-[0.98]"
    >
      <div className="bg-primary/10 text-primary group-hover:bg-primary/15 flex size-10 items-center justify-center rounded-full transition-colors">
        {icon}
      </div>
      <p className="text-sm font-medium">{label}</p>
    </Link>
  );
}

async function PublicEventsSection({ events, locale }: { events: EventRow[]; locale: string }) {
  const t = await getTranslations('HomePage.publicEvents');

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-16">
      <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t('title')}</h2>
      <p className="text-muted-foreground mt-1">{t('subtitle')}</p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/events/${event.slug}`}
            className="group bg-card hover:border-primary/40 flex flex-col overflow-hidden rounded-2xl border shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
          >
            {event.cover_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.cover_image_url}
                alt={event.name}
                className="aspect-video w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="from-primary/20 via-accent/25 to-primary/10 flex aspect-video w-full items-center justify-center bg-gradient-to-br">
                <TicketIcon className="text-primary/50 size-10" />
              </div>
            )}
            <div className="flex flex-1 flex-col gap-2 p-5">
              <h3 className="line-clamp-1 text-lg font-bold">{event.name}</h3>
              {event.event_date && (
                <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
                  <CalendarIcon className="size-4" />
                  {new Date(event.event_date).toLocaleDateString(locale)}
                </p>
              )}
              {event.location_text && (
                <p className="text-muted-foreground line-clamp-1 text-sm">{event.location_text}</p>
              )}
              <span className="text-primary mt-auto pt-2 text-sm font-medium">
                {t('viewButton')}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
