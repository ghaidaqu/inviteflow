import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { TiltCard } from '@/components/ui/tilt-card';
import { CheckIcon, ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';

type JourneyKey = 'invitation' | 'ticketing' | 'rsvp';

// Each journey is differentiated by weight/shade within a single red +
// neutral palette, not a different hue per card — a "rainbow" of accent
// colors (red/blue/green) read as a color-party, not the serious/official
// look this platform wants. Set as CSS custom properties scoped to the
// card, not global theme overrides.
const JOURNEY_STYLE: Record<JourneyKey, { accent: string; accentSoft: string; track: string }> = {
  invitation: {
    accent: 'oklch(0.62 0.22 20)', // the brand red — full color, the primary journey
    accentSoft: 'oklch(0.62 0.22 20 / 15%)',
    track: 'invitation',
  },
  ticketing: {
    accent: 'oklch(0.85 0.005 60)', // near-white/silver — neutral, professional
    accentSoft: 'oklch(0.85 0.005 60 / 12%)',
    track: 'event',
  },
  rsvp: {
    accent: 'oklch(0.6 0.01 60)', // mid gray — neutral, understated
    accentSoft: 'oklch(0.6 0.01 60 / 12%)',
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
      {/* Aurora backdrop, recolored for the dark neon-red identity — the
          blobs now sit on a near-black page, so they use mix-blend-screen
          (which brightens rather than muddies against dark) at higher
          opacity, so they read as actual glowing light sources, not a
          faint wash. Same wide looping motion + hue drift as before. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="animate-aurora-a absolute start-[-20%] top-[-25%] size-[34rem] rounded-full opacity-60 mix-blend-screen blur-[100px]"
          style={{ backgroundColor: 'oklch(0.6 0.26 18)' }}
        />
        <div
          className="animate-aurora-b absolute end-[-20%] top-[-10%] size-[30rem] rounded-full opacity-45 mix-blend-screen blur-[100px]"
          style={{ backgroundColor: 'oklch(0.5 0.22 355)' }}
        />
        <div
          className="animate-aurora-c absolute start-[10%] bottom-[-35%] size-[36rem] rounded-full opacity-40 mix-blend-screen blur-[100px]"
          style={{ backgroundColor: 'oklch(0.4 0.2 10)' }}
        />
        <div className="from-background/0 via-background/40 to-background absolute inset-0 bg-gradient-to-b" />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-4 py-12 text-center sm:px-6 sm:py-16">
        <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-col items-center gap-3 duration-700">
          <span className="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
            {t('eyebrow')}
          </span>
          <h1 className="text-glow max-w-xl text-2xl leading-[1.2] font-extrabold tracking-tight text-balance sm:text-4xl">
            {t('title')}
          </h1>
          <p className="text-muted-foreground max-w-md text-sm text-balance sm:text-base">
            {t('subtitle')}
          </p>
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
                    className="flex size-11 items-center justify-center rounded-xl text-xl"
                    style={{ backgroundColor: 'var(--journey-accent-soft)' }}
                  >
                    {tj(`${key}.emoji`)}
                  </span>

                  <div className="flex flex-col gap-1">
                    <h3 className="text-base font-bold tracking-tight">{tj(`${key}.title`)}</h3>
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
