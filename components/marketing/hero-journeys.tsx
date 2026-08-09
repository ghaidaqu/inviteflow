import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import {
  PlayIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  MailIcon,
  TicketIcon,
  ListChecksIcon,
} from 'lucide-react';

type JourneyKey = 'invitation' | 'ticketing' | 'rsvp';

// Three distinct editorial panel treatments — deep red, dark ink navy, and
// muted purple — deliberately different from each other (these are three
// separate products) and deliberately NOT the site's neon/glow language;
// flat, matte color blocks per the "premium editorial poster" direction.
const PANEL_STYLE: Record<
  JourneyKey,
  { photoFrom: string; photoTo: string; panel: string; track: string; icon: typeof MailIcon }
> = {
  invitation: {
    photoFrom: '#c23855',
    photoTo: '#7d0f28',
    panel: '#5c0e21',
    track: 'invitation',
    icon: MailIcon,
  },
  ticketing: {
    photoFrom: '#2c3550',
    photoTo: '#0e1420',
    panel: '#151b28',
    track: 'event',
    icon: TicketIcon,
  },
  rsvp: {
    photoFrom: '#6d4f82',
    photoTo: '#2f2038',
    panel: '#3a2844',
    track: 'rsvp',
    icon: ListChecksIcon,
  },
};

const JOURNEY_KEYS: JourneyKey[] = ['invitation', 'ticketing', 'rsvp'];

export async function HeroJourneys({ locale }: { locale: string }) {
  const t = await getTranslations('HomePage.hero');
  const tj = await getTranslations('HomePage.journeys');
  const tp = await getTranslations('HomePage.panels');
  const isRtl = locale === 'ar';
  const ArrowIcon = isRtl ? ArrowLeftIcon : ArrowRightIcon;

  return (
    <section className="relative overflow-hidden py-14 sm:py-20">
      <div className="mx-auto grid w-full max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-8">
        {/* Text content — first in DOM order lands on the reading-start
            side under RTL (the right), mirroring the reference's LTR
            layout rather than copying its literal left/right placement. */}
        <div className="animate-in fade-in slide-in-from-bottom-4 relative z-10 flex flex-col items-start gap-6 duration-700">
          <h1 className="text-4xl leading-[1.1] font-extrabold tracking-tight text-balance sm:text-6xl">
            {t('headlineLine1')}
            <br />
            <span className="text-primary">{t('headlineLine2')}</span>
          </h1>
          <p className="text-muted-foreground max-w-md text-lg text-balance">{t('subtitle')}</p>

          <div className="flex flex-wrap gap-3">
            <Button size="lg" nativeButton={false} render={<Link href="/register" />}>
              {t('primaryCta')}
            </Button>
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<a href="#how-it-works" />}
            >
              <PlayIcon className="size-4" />
              {t('secondaryCta')}
            </Button>
          </div>

          <Link
            href="/guest"
            className="text-muted-foreground hover:text-primary text-sm font-medium underline-offset-4 hover:underline"
          >
            {t('guestLink')}
          </Link>
        </div>

        {/* Graphic side — huge cropped serif "INVITE" behind three
            overlapping editorial panels. The panels are deliberately
            shorter than the container (not h-full) so the giant type
            visibly peeks out above and below them, cropped at the
            section edges — that gap is the whole point of the effect. */}
        <div className="relative flex min-h-[420px] items-center justify-center sm:min-h-[520px] lg:min-h-[600px]">
          <span
            aria-hidden
            className="text-foreground pointer-events-none absolute inset-0 flex items-center justify-center text-[clamp(5rem,15vw,12rem)] leading-none font-black tracking-tight select-none"
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            INVITE
          </span>

          <div className="relative z-10 flex h-[260px] items-stretch justify-center gap-4 sm:h-[320px] sm:gap-6 lg:h-[360px]">
            {JOURNEY_KEYS.map((key, index) => {
              const style = PANEL_STYLE[key];
              const Icon = style.icon;
              return (
                <Link
                  key={key}
                  href={`/dashboard/events/new/${style.track}`}
                  className={`group flex w-[26%] flex-col overflow-hidden rounded-2xl shadow-xl transition-transform duration-300 ease-out hover:-translate-y-2 sm:w-[29%] ${index === 1 ? 'lg:-translate-y-6' : ''}`}
                >
                  <div
                    className="relative flex flex-1 items-start p-3"
                    style={{
                      background: `linear-gradient(160deg, ${style.photoFrom}, ${style.photoTo})`,
                    }}
                  >
                    <span className="flex size-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm">
                      <Icon className="size-4.5" />
                    </span>
                  </div>
                  <div
                    className="flex flex-col gap-2 p-4 text-white"
                    style={{ backgroundColor: style.panel }}
                  >
                    <span className="text-xs font-semibold text-white/60 tabular-nums">
                      0{index + 1}
                    </span>
                    <h3 className="text-base font-bold tracking-tight sm:text-lg">
                      {tj(`${key}.title`)}
                    </h3>
                    <p className="hidden text-xs text-white/70 sm:block">{tj(`${key}.tagline`)}</p>
                    <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold">
                      {tp('exploreCta')}
                      <ArrowIcon className="size-3.5 transition-transform ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
