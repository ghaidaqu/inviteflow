import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import {
  PlayIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  MailIcon,
  TicketIcon,
  BarChart3Icon,
} from 'lucide-react';

type JourneyKey = 'invitation' | 'ticketing' | 'rsvp';

// Three distinct editorial panel treatments — deep red, dark ink navy, and
// muted purple — deliberately different from each other (these are three
// separate products) and deliberately NOT the site's neon/glow language.
// `photo` is a real (freely-licensed, self-hosted) photo evoking each
// journey; `tintFrom/tintTo` is a matching color wash laid over it so the
// three cards keep distinct brand identities instead of looking like plain
// stock photography.
const PANEL_STYLE: Record<
  JourneyKey,
  {
    photo: string;
    photoAlt: string;
    tintFrom: string;
    tintTo: string;
    panel: string;
    track: string;
    icon: typeof MailIcon;
  }
> = {
  invitation: {
    photo: '/images/hero/invitation.jpg',
    photoAlt: 'Wedding invitation stationery flat lay',
    tintFrom: 'rgba(156,42,65,0.45)',
    tintTo: 'rgba(61,9,22,0.85)',
    panel: '#3d0916',
    track: 'invitation',
    icon: MailIcon,
  },
  ticketing: {
    photo: '/images/hero/ticketing.jpg',
    photoAlt: 'Concert crowd under stage lights',
    tintFrom: 'rgba(35,44,68,0.5)',
    tintTo: 'rgba(8,10,16,0.9)',
    panel: '#080a10',
    track: 'event',
    icon: TicketIcon,
  },
  rsvp: {
    photo: '/images/hero/rsvp.jpg',
    photoAlt: 'Hand checking off items on a poll checklist',
    tintFrom: 'rgba(80,58,99,0.5)',
    tintTo: 'rgba(28,19,34,0.88)',
    panel: '#1c1322',
    track: 'rsvp',
    icon: BarChart3Icon,
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
            overlapping editorial panels. All three panels are the same
            fixed height and share one flex row (no per-card stagger) so
            their tops and bottoms line up in one straight band; the type
            peeks out above/below that band, cropped at the section edges.
            Sized to actually fit the column width so letters read cleanly
            instead of being amputated at the container edge. */}
        <div className="relative flex min-h-[440px] flex-col justify-end overflow-hidden pb-2 sm:min-h-[560px] lg:min-h-[620px]">
          <span
            aria-hidden
            className="text-foreground pointer-events-none absolute inset-0 flex items-start justify-center pt-6 text-[clamp(4.5rem,13vw,10rem)] leading-none font-black tracking-normal whitespace-nowrap select-none sm:pt-8"
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            INVITE
          </span>

          {/* Forced left-to-right order (01 burgundy → 02 navy → 03 purple)
              regardless of page direction, matching the reference exactly
              instead of mirroring under RTL. Pulled up over the "INVITE"
              text with a transform (negative margin is a no-op here — the
              flex-end alignment on the single-item row just reclaims the
              space) so the cards visibly cover roughly its bottom quarter. */}
          <div
            dir="ltr"
            className="relative z-10 flex h-[280px] -translate-y-20 items-stretch justify-center gap-4 sm:h-[340px] sm:-translate-y-24 sm:gap-6 lg:h-[380px] lg:-translate-y-28"
          >
            {JOURNEY_KEYS.map((key, index) => {
              const style = PANEL_STYLE[key];
              const Icon = style.icon;
              return (
                <Link
                  key={key}
                  href={`/dashboard/events/new/${style.track}`}
                  className="group flex w-[26%] flex-col overflow-hidden rounded-2xl shadow-xl transition-transform duration-300 ease-out hover:-translate-y-2 sm:w-[29%]"
                >
                  <div className="relative flex flex-1 items-start overflow-hidden p-3">
                    <Image
                      src={style.photo}
                      alt={style.photoAlt}
                      fill
                      sizes="(min-width: 1024px) 220px, 33vw"
                      className="object-cover"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(160deg, ${style.tintFrom}, ${style.tintTo})`,
                      }}
                    />
                    <span className="relative flex size-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm">
                      <Icon className="size-4.5" />
                    </span>
                  </div>

                  {/* Wave divider — deliberately large amplitude (not a
                      subtle wobble) so the panel visibly rises up and
                      covers a real portion of the photo, per explicit
                      direction. Fill = panel color; negative margin pulls
                      it up over the photo underneath. */}
                  <svg
                    aria-hidden
                    viewBox="0 0 100 40"
                    preserveAspectRatio="none"
                    className="relative -mb-px block h-10 w-full"
                    style={{ marginTop: -34 }}
                  >
                    <path d="M0,40 L0,22 Q25,-6 50,16 T100,18 L100,40 Z" fill={style.panel} />
                  </svg>

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
