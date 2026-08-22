import { getTranslations } from 'next-intl/server';
import { BrandMark } from '@/components/brand-mark';

/**
 * The page's closing statement — same full-bleed near-black band that
 * final-cta.tsx used to own before it was deleted. Deliberately just the
 * heading + a "coming soon" note now — the previous version stated a
 * specific plan (3 free trials, no card, etc.) that wasn't real pricing,
 * just trial mechanics dressed up as a plan. Real pricing goes here once
 * it exists; until then this doesn't pretend to have an offer. The mark
 * above the heading is the one place on this dark, deliberately neutral
 * band that still carries the brand's rust/teal pair — BrandMark paints
 * its own fixed colors regardless of the surrounding dark text/background
 * tokens, so this section isn't the one spot on the page with zero tie
 * back to the logo.
 */
export async function PricingSection() {
  const t = await getTranslations('HomePage.pricing');

  return (
    <section id="pricing" className="bg-foreground text-background scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 text-center sm:px-6 sm:py-20">
        <BrandMark className="mx-auto mb-4 size-6" />
        <h2 className="font-display text-2xl sm:text-3xl">{t('title')}</h2>
        <p className="mt-3 text-base opacity-70">{t('subtitle')}</p>
      </div>
    </section>
  );
}
