import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

export async function FinalCta() {
  const t = await getTranslations('HomePage.finalCta');

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="from-primary to-primary/80 absolute inset-0 -z-10 bg-gradient-to-br"
      />
      <div aria-hidden className="bg-grain pointer-events-none absolute inset-0 -z-10 opacity-60" />

      <div className="text-primary-foreground mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-4 py-16 text-center sm:px-6 sm:py-24">
        <h2 className="text-2xl font-extrabold tracking-tight text-balance sm:text-4xl">
          {t('title')}
        </h2>
        <p className="text-primary-foreground/80 text-base sm:text-lg">{t('subtitle')}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Button
            size="lg"
            variant="secondary"
            className="shadow-lg"
            nativeButton={false}
            render={<Link href="/register" />}
          >
            {t('primaryCta')}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground bg-transparent"
            nativeButton={false}
            render={<Link href="/guest" />}
          >
            {t('secondaryCta')}
          </Button>
        </div>
      </div>
    </section>
  );
}
