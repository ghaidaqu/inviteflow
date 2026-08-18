import { getTranslations } from 'next-intl/server';

/**
 * A single statement, not a grid of type tiles — the tile grid (one card
 * per supported event type) read as clutter once the hero already shows
 * three real, distinct products. The list of supported types still lives
 * in the actual creation flow (lib/validations/events.ts); this section
 * is just the short reassurance that the product isn't wedding-only.
 */
export async function OccasionGallery() {
  const t = await getTranslations('HomePage.occasions');

  return (
    <section id="templates" className="mx-auto w-full max-w-3xl scroll-mt-20 px-4 py-10 sm:px-6">
      <p className="text-center text-lg text-balance sm:text-xl">
        <span className="font-display">{t('title')}</span>{' '}
        <span className="text-muted-foreground">{t('subtitle')}</span>
      </p>
    </section>
  );
}
