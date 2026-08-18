import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, ArrowRightIcon, MailIcon, LinkIcon, Building2Icon } from 'lucide-react';

type JourneyKey = 'invitation' | 'rsvp' | 'institutional';

// Three real products, three token-driven surfaces — olive, tinted sky,
// and the one dark card, matching the approved reference's three-color
// card grid exactly (not a light/neutral card standing in for one of
// them). Every color here comes from the shared design system, so
// `currentColor` alone (via `text-current`/`bg-current`) is enough to
// theme the icon badge, bullet dots, and index number correctly on all
// three without a per-card color branch.
const JOURNEY_STYLE: Record<
  JourneyKey,
  {
    surface: string;
    /** Invitation/Link go through the no-login-wall quick-start flow;
     *  Institutional needs a company name/logo up front by design, so it
     *  keeps going straight to the authenticated dashboard flow. */
    href: string;
    icon: typeof MailIcon;
  }
> = {
  invitation: {
    surface: 'bg-primary text-primary-foreground',
    href: '/start/invitation',
    icon: MailIcon,
  },
  rsvp: {
    surface: 'bg-secondary/45 text-secondary-foreground',
    href: '/start/rsvp',
    icon: LinkIcon,
  },
  institutional: {
    surface: 'bg-foreground text-background',
    href: '/dashboard/events/new/institutional',
    icon: Building2Icon,
  },
};

const JOURNEY_KEYS: JourneyKey[] = ['invitation', 'rsvp', 'institutional'];

export async function HeroJourneys({ locale }: { locale: string }) {
  const t = await getTranslations('HomePage.hero');
  const tt = await getTranslations('HomePage.tracks');
  const isRtl = locale === 'ar';
  const ArrowIcon = isRtl ? ArrowLeftIcon : ArrowRightIcon;

  return (
    <section id="journeys" className="relative overflow-hidden py-14 sm:py-20">
      <div className="mx-auto grid w-full max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-8">
        {/* Text content — first in DOM order lands on the reading-start
            side under RTL (the right), mirroring the reference's LTR
            layout rather than copying its literal left/right placement. */}
        <div className="animate-in fade-in slide-in-from-bottom-4 relative z-10 flex flex-col items-start gap-6 duration-700">
          <h1 className="font-display text-4xl leading-[1.1] text-balance sm:text-6xl">
            {t('headlineLine1')}
            <br />
            <span className="text-primary">{t('headlineLine2')}</span>
          </h1>
          <p className="text-muted-foreground max-w-md text-lg text-balance">{t('subtitle')}</p>

          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              variant="secondary"
              nativeButton={false}
              render={<Link href="/register" />}
            >
              {t('primaryCta')}
            </Button>
          </div>
        </div>

        {/* Three real products, three cards — quiet by default, each
            getting the same cyan ring + lift on hover/focus (.hover-glow,
            defined once in globals.css). The icon fades out and a content
            block grows in below the title — features + the discover link,
            both hidden until then — using a grid-rows 0fr->1fr animation
            for a real height reveal instead of an opacity-only crossfade,
            matching the reference's card-reveal motion. Forced
            left-to-right order (01 → 02 → 03) regardless of page
            direction, since these read as a fixed sequence of paths
            through the product, not a mirrored layout. */}
        <div dir="ltr" className="relative z-10 grid grid-cols-3 gap-3 sm:gap-5">
          {JOURNEY_KEYS.map((key, index) => {
            const style = JOURNEY_STYLE[key];
            const Icon = style.icon;
            const features = [tt(`${key}.feature1`), tt(`${key}.feature2`), tt(`${key}.feature3`)];

            return (
              <Link
                key={key}
                href={style.href}
                className={`hover-glow group relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-2xl p-3.5 sm:min-h-[280px] sm:p-5 ${style.surface}`}
              >
                <span className="relative flex size-9 items-center justify-center rounded-full bg-current/10 ring-1 ring-current/15 transition-opacity duration-300 group-hover:opacity-0">
                  <Icon className="size-4.5" />
                </span>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold tabular-nums opacity-60">
                    0{index + 1}
                  </span>
                  <h3 className="font-display text-base leading-snug sm:text-lg">
                    {tt(`${key}.title`)}
                  </h3>

                  <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-out group-hover:grid-rows-[1fr] group-focus-visible:grid-rows-[1fr]">
                    <div className="overflow-hidden">
                      {/* dir set explicitly per-locale rather than
                          inheriting the row's forced dir="ltr" (that
                          one's only there to keep 01→02→03 card order
                          stable under RTL) — without it the bullet dot
                          lands on the wrong side of Arabic text. */}
                      <div
                        dir={isRtl ? 'rtl' : 'ltr'}
                        className="flex flex-col gap-1 pt-1.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
                      >
                        {features.map((feature) => (
                          <span
                            key={feature}
                            className="flex items-center gap-1.5 text-xs leading-tight font-medium sm:text-sm"
                          >
                            <span className="size-1.5 shrink-0 rounded-full bg-current" />
                            {feature}
                          </span>
                        ))}
                        <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold">
                          {tt('cta')}
                          <ArrowIcon className="size-3.5 transition-transform ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
