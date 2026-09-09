import { getTranslations } from 'next-intl/server';

/**
 * The page's closing statement — same full-bleed near-black band that
 * final-cta.tsx used to own before it was deleted. Deliberately just the
 * heading + a "coming soon" note now — the previous version stated a
 * specific plan (3 free trials, no card, etc.) that wasn't real pricing,
 * just trial mechanics dressed up as a plan. Real pricing goes here once
 * it exists; until then this doesn't pretend to have an offer.
 */
export async function PricingSection() {
  const t = await getTranslations('HomePage.pricing');

  return (
    <section id="pricing" className="section-y bg-foreground text-background scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-4 text-center sm:px-6">
        <h2 className="font-display text-xl sm:text-2xl">{t('title')}</h2>
        <p className="mt-3 text-base opacity-70">{t('subtitle')}</p>
      </div>
    </section>
  );
}
