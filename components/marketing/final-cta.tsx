import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

export async function FinalCta() {
  const t = await getTranslations('HomePage.finalCta');

  return (
    // A full-bleed near-black band — the "alternate ivory/near-black
    // rhythm" the editorial direction calls for, not another light card.
    <section className="bg-foreground text-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-5 px-4 py-20 text-center sm:px-6 sm:py-28">
        <h2 className="text-3xl font-extrabold tracking-tight text-balance sm:text-5xl">
          {t('title')}
        </h2>
        <p className="max-w-md text-base opacity-70 sm:text-lg">{t('subtitle')}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Button size="lg" nativeButton={false} render={<Link href="/register" />}>
            {t('primaryCta')}
          </Button>
        </div>
      </div>
    </section>
  );
}
