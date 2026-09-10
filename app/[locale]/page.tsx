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
import { ClosingStatement } from '@/components/marketing/closing-statement';
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
          {/* Photo hero (an entrance, "كل دعوة... باب مفتوح") leads now
            instead of the plain-text headline — a strong image earns the
            opening slot better than typography alone. The two-track
            "ways" list sits right under it, inside the same component,
            since choosing a path is the very next thing a visitor needs.
            The original headline ("ترسلها بضغطة...") didn't disappear —
            it moved to ClosingStatement, a quiet reprise right before
            pricing instead of the opening statement. */}
          {/* Choosing a track is the point of the page, so it sits directly
            under the hero — and what the guest actually receives comes
            immediately after it, because "which of these two do I need?"
            is answered far better by showing the thing than by describing
            it. "Send yourself one" follows: by then a visitor has seen
            the message, so the offer is to feel it rather than imagine
            it. The rest is for whoever still wants more. */}
          <HeroJourneys />
          <TrackOptions locale={locale} />
          <ProductPreview />
          <TryBand />
          <TrustStrip />
          <Faq />
          <PricingSection locale={locale} />
          <ClosingStatement />
        </main>
      </PricingProvider>
      <SiteFooter />
    </>
  );
}
