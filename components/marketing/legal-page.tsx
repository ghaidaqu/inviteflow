import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { ArrowLeftIcon } from 'lucide-react';

/**
 * Shared layout for /terms and /privacy — plain and readable rather than
 * the marketing pages' gradient/animation treatment, which would fight
 * with a document people are actually trying to read.
 *
 * Sections are numbered keys (section1Heading/section1Body, ...) rather
 * than a translated array, matching how the rest of messages/*.json is
 * structured — next-intl's t() reads one key at a time here too.
 */
export async function LegalPage({
  namespace,
  sectionCount,
}: {
  namespace: 'terms' | 'privacy';
  sectionCount: number;
}) {
  const t = await getTranslations(`Legal.${namespace}`);
  const tLegal = await getTranslations('Legal');

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <Link
        href="/"
        className="text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 text-sm hover:underline"
      >
        <ArrowLeftIcon className="size-3.5 rtl:rotate-180" />
        {tLegal('backHome')}
      </Link>

      <h1 className="mt-4 text-3xl font-bold tracking-tight">{t('title')}</h1>
      <p className="text-muted-foreground mt-1 text-sm">{tLegal('lastUpdated')}</p>
      <p className="text-muted-foreground mt-6 text-lg text-balance">{t('intro')}</p>

      <div className="mt-8 flex flex-col gap-6">
        {Array.from({ length: sectionCount }, (_, i) => i + 1).map((n) => (
          <section key={n}>
            <h2 className="text-lg font-bold tracking-tight">{t(`section${n}Heading`)}</h2>
            <p className="text-muted-foreground mt-2 leading-relaxed whitespace-pre-line">
              {t(`section${n}Body`)}
            </p>
          </section>
        ))}
      </div>
    </main>
  );
}
