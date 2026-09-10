import { setRequestLocale } from 'next-intl/server';
import { SiteNav } from '@/components/marketing/site-nav';
import { HeroJourneys } from '@/components/marketing/hero-journeys';
import { TrustStrip } from '@/components/marketing/trust-strip';
import { TrackOptions } from '@/components/marketing/track-options';
import { ProductPreview } from '@/components/marketing/product-preview';
import { TryBand } from '@/components/marketing/try-band';
import { Faq } from '@/components/marketing/faq';
import { PricingSection } from '@/components/marketing/pricing-section';
import { PricingProvider } from '@/components/marketing/pricing-state';
import { SiteFooter } from '@/components/marketing/site-footer';

export const revalidate = 60;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <SiteNav />
      {/* Both calculators read one guest count, so the price near the
          bottom can never disagree with the one up top. */}
      <PricingProvider>
        <main className="flex flex-col">
          {/* A photo hero opens — a strong image earns that slot better
            than typography alone — and the track choice sits directly
            under it, because picking a path is the next thing a visitor
            needs. What the guest actually receives comes right after,
            since "which of these two do I need?" is answered far better
            by showing the thing than by describing it. "Send yourself
            one" follows: by then they have seen the message, so the
            offer is to feel it rather than imagine it.

            The page ends on the price. It used to end on a second call
            to action below it, which just repeated the button the
            calculator already has three inches higher. */}
          <HeroJourneys />
          <TrackOptions locale={locale} />
          <ProductPreview />
          <TryBand />
          <TrustStrip />
          <Faq />
          <PricingSection locale={locale} />
        </main>
      </PricingProvider>
      <SiteFooter />
    </>
  );
}
