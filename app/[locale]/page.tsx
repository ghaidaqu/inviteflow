import { setRequestLocale } from 'next-intl/server';
import { SiteNav } from '@/components/marketing/site-nav';
import { HeroJourneys } from '@/components/marketing/hero-journeys';
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
        {/* The hero subtitle alone carries the whole pitch now — WhatsApp
            mechanics, no sign-up, and occasion range ("from weddings to
            conferences") — replacing what used to be three separate
            sections (why-InviteFlow, an occasion-type tile grid, a
            second CTA band) each repeating a slice of the same pitch. */}
        <HeroJourneys locale={locale} />
        {/* Pricing is the page's closing statement now — it carries the
            dark full-bleed band that final-cta.tsx used to own (deleted:
            its own copy was pure repetition of the hero's CTA once the
            hero subtitle became comprehensive enough on its own). */}
        <PricingSection />
      </main>
      <SiteFooter />
    </>
  );
}
