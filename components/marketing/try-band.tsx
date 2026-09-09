import { getTranslations } from 'next-intl/server';
import { TryDemoForm } from '@/components/public/try-demo-form';

/**
 * "Send one to yourself" — the strongest thing this product can say to a
 * stranger, and the cheapest way for them to believe it.
 *
 * This lived inside the hero for a moment and had to come out: a form
 * card sitting on the photograph covered the image and made the opening
 * feel busy. On its own quiet band it asks for the same two fields
 * without fighting anything for attention.
 */
export async function TryBand() {
  const t = await getTranslations('TryDemo');

  return (
    <section className="section-y bg-primary/5 border-border/60 border-y">
      <div className="mx-auto grid w-full max-w-4xl items-center gap-8 px-4 sm:px-6 md:grid-cols-2 md:gap-12">
        <div>
          <p className="text-primary text-sm font-semibold">{t('bandEyebrow')}</p>
          <h2 className="font-display mt-2 text-xl text-balance sm:text-2xl">{t('heroTitle')}</h2>
          <p className="text-muted-foreground mt-2 text-base leading-relaxed">
            {t('heroSubtitle')}
          </p>
        </div>
        <div className="bg-card rounded-2xl border p-5 shadow-sm sm:p-6">
          <TryDemoForm />
        </div>
      </div>
    </section>
  );
}
