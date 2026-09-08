import { setRequestLocale } from 'next-intl/server';
import { SiteNav } from '@/components/marketing/site-nav';
import { HeroJourneys } from '@/components/marketing/hero-journeys';
import { TrustStrip } from '@/components/marketing/trust-strip';
import { TrackOptions } from '@/components/marketing/track-options';
import { ProductPreview } from '@/components/marketing/product-preview';
import { HowItWorks } from '@/components/marketing/how-it-works';
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
        {/* Order follows what a stranger actually asks, in order: what is
            this and can I try it (hero) → is it safe/quick (trust strip)
            → what does it look like (preview) → which one do I need
            (the tracks list, inside HeroJourneys). */}
        <HeroJourneys />
        <TrustStrip />
        <ProductPreview />
        <TrackOptions locale={locale} />
        <HowItWorks />
        <Faq />
        <ClosingStatement />
        <PricingSection />
      </main>
      <SiteFooter />
    </>
  );
}
