import { setRequestLocale } from 'next-intl/server';
import { SiteNav } from '@/components/marketing/site-nav';
import { HeroJourneys } from '@/components/marketing/hero-journeys';
import { TrustStrip } from '@/components/marketing/trust-strip';
import { TrackOptions } from '@/components/marketing/track-options';
import { ProductPreview } from '@/components/marketing/product-preview';
import { HowItWorks } from '@/components/marketing/how-it-works';
import { TryBand } from '@/components/marketing/try-band';
import { Faq } from '@/components/marketing/faq';
import { ClosingStatement } from '@/components/marketing/closing-statement';
import { PricingSection } from '@/components/marketing/pricing-section';
import { SiteFooter } from '@/components/marketing/site-footer';

export const revalidate = 60;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <SiteNav />
      <main className="flex flex-col">
        {/* Photo hero (an entrance, "كل دعوة... باب مفتوح") leads now
            instead of the plain-text headline — a strong image earns the
            opening slot better than typography alone. The two-track
            "ways" list sits right under it, inside the same component,
            since choosing a path is the very next thing a visitor needs.
            The original headline ("ترسلها بضغطة...") didn't disappear —
            it moved to ClosingStatement, a quiet reprise right before
            pricing instead of the opening statement. */}
        {/* Choosing a track is the whole point of the page, so it sits
            immediately under the hero rather than behind three sections of
            scrolling. Everything after it is for the visitor who wants
            more before deciding: why (strip) → what it looks like
            (preview) → send yourself one (try) → how → objections. */}
        <HeroJourneys />
        <TrackOptions locale={locale} />
        <TrustStrip />
        <ProductPreview />
        <TryBand />
        <HowItWorks />
        <Faq />
        <ClosingStatement />
        <PricingSection />
      </main>
      <SiteFooter />
    </>
  );
}
