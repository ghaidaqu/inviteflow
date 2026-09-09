import { getTranslations } from 'next-intl/server';
import { ChevronDownIcon } from 'lucide-react';

const QUESTIONS = ['q1', 'q2', 'q3', 'q4', 'q5'] as const;

/**
 * The objections that actually stop someone from trying this, answered
 * plainly. Collapsed by default and built on <details> — native
 * disclosure, so it needs no JavaScript, works before hydration, and is
 * keyboard- and screen-reader-correct for free.
 *
 * Collapsed matters for more than tidiness here: five open answers would
 * add a wall of text to a page whose whole appeal is that it feels calm.
 * Closed, it adds five short lines and answers everything on demand.
 */
export async function Faq() {
  const t = await getTranslations('HomePage.faq');

  return (
    <section className="section-y">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <h2 className="text-primary text-lg font-bold sm:text-xl">{t('eyebrow')}</h2>

        <div className="mt-6 flex flex-col">
          {QUESTIONS.map((q, index) => (
            <details
              key={q}
              className={`group py-4 ${index > 0 ? 'border-border/60 border-t' : ''}`}
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-medium marker:content-none [&::-webkit-details-marker]:hidden">
                {t(`${q}Question`)}
                <ChevronDownIcon className="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                {t(`${q}Answer`)}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
