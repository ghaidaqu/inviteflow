import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { CheckIcon } from 'lucide-react';

export async function PricingSection() {
  const t = await getTranslations('HomePage.pricing');

  return (
    <section
      id="pricing"
      className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24"
    >
      <div className="mx-auto max-w-xl text-center">
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t('title')}</h2>
        <p className="text-muted-foreground mt-3 text-base">{t('subtitle')}</p>
      </div>

      {/* A single, honest tier — no fabricated multi-plan pricing table for
          a product that doesn't have paid subscription tiers. */}
      <div className="border-primary/30 bg-card shadow-primary/5 relative mx-auto mt-10 flex max-w-md flex-col gap-5 rounded-3xl border-2 p-8 text-center shadow-xl">
        <h3 className="text-xl font-extrabold">{t('planTitle')}</h3>
        <ul className="mx-auto flex flex-col gap-2.5 text-start">
          {(['planPoint1', 'planPoint2', 'planPoint3'] as const).map((key) => (
            <li key={key} className="flex items-center gap-2.5 text-sm">
              <CheckIcon className="text-primary size-4.5 shrink-0" />
              {t(key)}
            </li>
          ))}
        </ul>
        <Button
          size="lg"
          className="w-full"
          nativeButton={false}
          render={<Link href="/register" />}
        >
          {t('cta')}
        </Button>
      </div>
    </section>
  );
}
