import { PriceCalculator } from '@/components/marketing/price-calculator';
import { pricingCopy } from '@/components/marketing/pricing-copy';

/**
 * The price again, near the end.
 *
 * The first calculator sits under the track choice, where it answers "how
 * much for my event?" at the moment someone picks a track. This one is for
 * the visitor who scrolled past that, read everything, and now wants the
 * number without hunting back up the page — which is where people look for
 * pricing on any site.
 *
 * It is the same component reading the same guest count (see
 * pricing-state.tsx), so the two can never quote different figures. This
 * one owns the #pricing anchor, being the one a link should land on.
 */
export async function PricingSection({ locale }: { locale: string }) {
  return (
    <section className="section-y border-border/60 border-t">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <PriceCalculator
          id="pricing"
          idPrefix="pricing-full"
          locale={locale}
          href="/start/invitation"
          copy={await pricingCopy()}
        />
      </div>
    </section>
  );
}
