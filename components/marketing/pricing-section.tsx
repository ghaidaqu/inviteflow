import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { CheckIcon } from 'lucide-react';

/**
 * The page's closing statement — same full-bleed near-black band that
 * final-cta.tsx used to own before it was deleted (its own "ready to
 * start" copy was pure repetition once this section already ends on a
 * CTA). Pricing keeps its own honest, single-tier copy; it just now
 * carries the dramatic dark treatment instead of a second, separate
 * dark section right after it.
 */
export async function PricingSection() {
  const t = await getTranslations('HomePage.pricing');

  return (
    <section id="pricing" className="bg-foreground text-background scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-display text-2xl sm:text-3xl">{t('title')}</h2>
          <p className="mt-3 text-base opacity-70">{t('subtitle')}</p>
        </div>

        {/* A single, honest tier — no fabricated multi-plan pricing table
            for a product that doesn't have paid subscription tiers. */}
        <div className="border-background/25 mx-auto mt-8 flex max-w-md flex-col items-center gap-4 border-t pt-6 text-center">
          <h3 className="font-display text-xl">{t('planTitle')}</h3>
          <ul className="mx-auto flex flex-col gap-2.5 text-start">
            {(['planPoint1', 'planPoint2', 'planPoint3'] as const).map((key) => (
              <li key={key} className="flex items-center gap-2.5 text-sm opacity-90">
                <CheckIcon className="size-4.5 shrink-0" />
                {t(key)}
              </li>
            ))}
          </ul>
          <Button
            size="lg"
            variant="secondary"
            className="w-full"
            nativeButton={false}
            render={<Link href="/try" />}
          >
            {t('cta')}
          </Button>
        </div>
      </div>
    </section>
  );
}
