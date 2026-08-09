import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { CalendarIcon, TicketIcon } from 'lucide-react';
import { createPublicClient } from '@/lib/supabase/public';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { listPublicTicketedEvents } from '@/lib/services/events.service';
import { SiteNav } from '@/components/marketing/site-nav';
import { HeroJourneys } from '@/components/marketing/hero-journeys';
import { TrustStrip } from '@/components/marketing/trust-strip';
import { WhyInviteFlow } from '@/components/marketing/why-inviteflow';
import { ProductPreviews } from '@/components/marketing/product-previews';
import { OccasionGallery } from '@/components/marketing/occasion-gallery';
import { FeatureComparison } from '@/components/marketing/feature-comparison';
import { HowItWorks } from '@/components/marketing/how-it-works';
import { PricingSection } from '@/components/marketing/pricing-section';
import { FinalCta } from '@/components/marketing/final-cta';
import { SiteFooter } from '@/components/marketing/site-footer';
import type { Database } from '@/types/supabase';

type EventRow = Database['public']['Tables']['events']['Row'];

// Cookie-free public client (see lib/supabase/public.ts) so this page stays
// cacheable under real traffic instead of hitting the database on every
// single request — see the perf work earlier in this project's history.
export const revalidate = 60;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  let events: EventRow[] = [];
  if (isSupabaseConfigured()) {
    const supabase = createPublicClient();
    events = await listPublicTicketedEvents(supabase);
  }

  return (
    <>
      <SiteNav />
      <main className="flex flex-col">
        <HeroJourneys locale={locale} />
        <TrustStrip />
        <WhyInviteFlow />
        <OccasionGallery />
        <HowItWorks />
        <ProductPreviews />
        {events.length > 0 && <PublicEventsSection events={events} locale={locale} />}
        <FeatureComparison />
        <PricingSection />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}

async function PublicEventsSection({ events, locale }: { events: EventRow[]; locale: string }) {
  const t = await getTranslations('HomePage.publicEvents');

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <h2 className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
        {t('title')}
      </h2>
      <p className="text-muted-foreground mt-3 text-center text-lg">{t('subtitle')}</p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
