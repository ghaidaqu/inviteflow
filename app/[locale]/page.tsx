import { setRequestLocale } from 'next-intl/server';
import { SiteNav } from '@/components/marketing/site-nav';
import { HeroJourneys } from '@/components/marketing/hero-journeys';
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
        <HeroJourneys locale={locale} />
        <ClosingStatement />
        <PricingSection />
      </main>
      <SiteFooter />
    </>
  );
}
