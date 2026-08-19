import { getTranslations } from 'next-intl/server';

/**
 * The page's emotional close, right before the pricing band — this used
 * to be the hero headline itself, but a strong photo works harder as the
 * opening statement, so this moved down to become the quiet reprise
 * instead. Plain text, no image, no CTA repeated here (the hero and the
 * ways-list right above already carry the actions).
 */
export async function ClosingStatement() {
  const t = await getTranslations('HomePage.closing');

  return (
    <section className="bg-muted/40 border-y py-14 sm:py-20">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 px-4 text-center sm:px-6">
        <h2 className="font-display text-2xl leading-[1.35] text-balance sm:text-3xl">
          {t('headlineLine1')} <span className="text-primary">{t('headlineLine2')}</span>
        </h2>
        <p className="text-muted-foreground text-lg text-balance">{t('subtitle')}</p>
      </div>
    </section>
  );
}
