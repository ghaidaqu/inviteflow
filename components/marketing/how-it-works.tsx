import { getTranslations } from 'next-intl/server';
import { ListChecksIcon, PencilLineIcon, SendIcon } from 'lucide-react';

const STEPS = [
  { titleKey: 'step1Title', descKey: 'step1Description', icon: ListChecksIcon },
  { titleKey: 'step2Title', descKey: 'step2Description', icon: PencilLineIcon },
  { titleKey: 'step3Title', descKey: 'step3Description', icon: SendIcon },
] as const;

export async function HowItWorks() {
  const t = await getTranslations('HomePage.howItWorks');

  return (
    <section
      id="how-it-works"
      className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24"
    >
      <h2 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
        {t('title')}
      </h2>

      <div className="relative mt-14 grid gap-10 sm:grid-cols-3">
        {/* connecting line between steps, desktop only */}
        <div
          aria-hidden
          className="bg-border absolute start-[16.5%] end-[16.5%] top-6 hidden h-px sm:block"
        />

        {STEPS.map((step, index) => (
          <div
            key={step.titleKey}
            className="relative flex flex-col items-center gap-3 text-center"
          >
            <span className="bg-primary text-primary-foreground relative z-10 flex size-12 items-center justify-center rounded-full text-lg font-bold">
              {index + 1}
            </span>
            <step.icon className="text-primary size-6" />
            <h3 className="text-lg font-bold">{t(step.titleKey)}</h3>
            <p className="text-muted-foreground max-w-56 text-sm text-balance">{t(step.descKey)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
