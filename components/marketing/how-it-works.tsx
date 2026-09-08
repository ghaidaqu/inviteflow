import { getTranslations } from 'next-intl/server';

const STEPS = ['step1', 'step2', 'step3'] as const;

/**
 * Three steps, because the honest answer to "how does this work?" is
 * three steps — the numbering here is the actual sequence, not decoration
 * bolted onto an unordered list.
 *
 * Kept to a single line of explanation each: a visitor who wants more
 * detail than this is better served by the try-it form in the hero than
 * by more paragraphs here.
 */
export async function HowItWorks() {
  const t = await getTranslations('HomePage.how');

  return (
    <section className="border-border/60 border-b py-14 sm:py-20">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <h2 className="text-primary text-lg font-bold sm:text-xl">{t('eyebrow')}</h2>

        <ol className="mt-8 grid gap-8 sm:grid-cols-3 sm:gap-6">
          {STEPS.map((step, index) => (
            <li key={step} className="flex flex-col gap-2">
              <span className="text-primary/40 font-display text-3xl tabular-nums">
                {String(index + 1).padStart(2, '0')}
              </span>
              <p className="font-display text-lg">{t(`${step}Title`)}</p>
              <p className="text-muted-foreground text-sm leading-relaxed">{t(`${step}Body`)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
