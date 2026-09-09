import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

/**
 * The page's emotional close — this used to be the hero headline itself,
 * but a strong photo works harder as the opening statement, so it moved
 * down to become the quiet reprise instead.
 *
 * It now sits last, after the pricing band rather than before it, and
 * carries the final call to action: ending the page on "pricing isn't
 * ready yet" left a visitor with nowhere to go at the exact moment they'd
 * finished reading.
 */
export async function ClosingStatement() {
  const t = await getTranslations('HomePage.closing');

  return (
    <section className="section-y bg-muted/40 border-y">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 px-4 text-center sm:px-6">
        <h2 className="font-display text-xl leading-[1.35] text-balance sm:text-2xl">
          {t('headlineLine1')} <span className="text-primary">{t('headlineLine2')}</span>
        </h2>
        <p className="text-muted-foreground text-lg text-balance">{t('subtitle')}</p>
        <Button
          size="lg"
          className="mt-2 px-10"
          nativeButton={false}
          render={<Link href="#options" />}
        >
          {t('cta')}
        </Button>
      </div>
    </section>
  );
}
