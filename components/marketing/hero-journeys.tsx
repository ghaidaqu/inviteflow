import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { TiltCard } from '@/components/ui/tilt-card';
import { CheckIcon, ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';

type JourneyKey = 'invitation' | 'ticketing' | 'rsvp';

// Each journey gets its own accent within the shared cream/burgundy system —
// distinct enough that the three cards read as three different products at
// a glance, without breaking the site's overall identity. Set as CSS custom
// properties scoped to the card, not global theme overrides.
const JOURNEY_STYLE: Record<JourneyKey, { accent: string; accentSoft: string; track: string }> = {
  invitation: {
    accent: 'oklch(0.47 0.19 15)', // the brand burgundy — richest, most emotional
    accentSoft: 'oklch(0.47 0.19 15 / 10%)',
    track: 'invitation',
  },
  ticketing: {
    accent: 'oklch(0.42 0.09 250)', // cool slate-blue — professional, modern
    accentSoft: 'oklch(0.42 0.09 250 / 10%)',
    track: 'event',
  },
  rsvp: {
    accent: 'oklch(0.5 0.11 165)', // teal-green — clean, analytical
    accentSoft: 'oklch(0.5 0.11 165 / 10%)',
    track: 'rsvp',
  },
};

const JOURNEY_KEYS: JourneyKey[] = ['invitation', 'ticketing', 'rsvp'];

export async function HeroJourneys({ locale }: { locale: string }) {
  const t = await getTranslations('HomePage.hero');
  const tj = await getTranslations('HomePage.journeys');
  const isRtl = locale === 'ar';
  const ArrowIcon = isRtl ? ArrowLeftIcon : ArrowRightIcon;

  return (
    <section className="bg-grain relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="bg-primary/20 animate-drift-a absolute start-[-15%] top-[-20%] size-[28rem] rounded-full blur-3xl" />
        <div className="bg-accent/30 animate-drift-b absolute end-[-15%] top-[5%] size-[24rem] rounded-full blur-3xl" />
        <div className="bg-primary/10 animate-drift-c absolute start-[15%] bottom-[-25%] size-[32rem] rounded-full blur-3xl" />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-10 px-4 py-16 text-center sm:px-6 sm:py-24">
        <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-col items-center gap-4 duration-700">
          <span className="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium">
            {t('eyebrow')}
          </span>
          <h1 className="max-w-3xl text-4xl leading-[1.1] font-extrabold tracking-tight text-balance sm:text-6xl">
            {t('title')}
          </h1>
          <p className="text-muted-foreground max-w-lg text-lg text-balance">{t('subtitle')}</p>
        </div>

        <div
          id="journeys"
          className="animate-in fade-in slide-in-from-bottom-4 grid w-full scroll-mt-24 gap-5 delay-150 duration-700 [perspective:1000px] sm:grid-cols-3"
        >
          {JOURNEY_KEYS.map((key, index) => {
            const style = JOURNEY_STYLE[key];
            return (
              <TiltCard key={key} className="h-full">
                <Link
                  href={`/dashboard/events/new/${style.track}`}
                  className="group border-border/70 bg-card relative flex h-full flex-col items-start gap-4 overflow-hidden rounded-3xl border p-6 text-start shadow-sm transition-shadow hover:shadow-2xl"
                  style={
                    {
                      '--journey-accent': style.accent,
                      '--journey-accent-soft': style.accentSoft,
                      animationDelay: `${index * 80}ms`,
                    } as React.CSSProperties
                  }
                >
                  <div
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-1"
                    style={{ backgroundColor: 'var(--journey-accent)' }}
                  />

                  <span
                    className="flex size-14 items-center justify-center rounded-2xl text-3xl"
                    style={{ backgroundColor: 'var(--journey-accent-soft)' }}
                  >
                    {tj(`${key}.emoji`)}
                  </span>

                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-xl font-bold tracking-tight">{tj(`${key}.title`)}</h3>
                    <p className="text-muted-foreground text-sm">{tj(`${key}.tagline`)}</p>
                  </div>

                  <ul className="flex flex-col gap-2 text-sm">
                    {(['bullet1', 'bullet2', 'bullet3'] as const).map((bulletKey) => (
                      <li key={bulletKey} className="flex items-start gap-2">
                        <CheckIcon
                          className="mt-0.5 size-4 shrink-0"
                          style={{ color: 'var(--journey-accent)' }}
                        />
                        <span>{tj(`${key}.${bulletKey}`)}</span>
                      </li>
                    ))}
                  </ul>

                  <span
                    className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold"
                    style={{ color: 'var(--journey-accent)' }}
                  >
                    {tj(`${key}.cta`)}
                    <ArrowIcon className="size-4 transition-transform ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                  </span>
                </Link>
              </TiltCard>
            );
          })}
        </div>

        <Link
          href="/guest"
          className="text-muted-foreground hover:text-primary animate-in fade-in text-sm font-medium underline-offset-4 delay-300 duration-700 hover:underline"
        >
          {t('guestLink')}
        </Link>
      </div>
    </section>
  );
}
