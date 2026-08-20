import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, ArrowRightIcon, MailIcon, LinkIcon } from 'lucide-react';
import heroDoorway from '@/public/images/marketing/hero-doorway.jpg';

type JourneyKey = 'invitation' | 'rsvp';

// Two real products, one color — both tracks read as the same brand
// (primary/rust) now instead of being split rust-vs-teal, per explicit
// feedback that the two-color split made the page feel inconsistent.
// `currentColor` (via `text-current`) still themes the icon badge and CTA
// link — it's just always primary now, not a per-card branch.
//
// Goes straight into the wizard, no login first — see
// start/[track]/page.tsx: the wizard itself is open to anonymous visitors
// now, and only asks for an account at its very last step. Landing
// unauthenticated on an empty form used to be pointless when the page
// immediately bounced to /login; now it's the whole point.
const JOURNEY_STYLE: Record<JourneyKey, { href: string; icon: typeof MailIcon }> = {
  invitation: { href: '/start/invitation', icon: MailIcon },
  rsvp: { href: '/start/rsvp', icon: LinkIcon },
};

const JOURNEY_KEYS: JourneyKey[] = ['invitation', 'rsvp'];

export async function HeroJourneys({ locale }: { locale: string }) {
  const t = await getTranslations('HomePage.hero');
  const tw = await getTranslations('HomePage.ways');
  const tt = await getTranslations('HomePage.tracks');
  const isRtl = locale === 'ar';
  const ArrowIcon = isRtl ? ArrowLeftIcon : ArrowRightIcon;

  return (
    <>
      {/* Full-bleed photo hero — an entrance, not a person, so the image
          reads as "welcome" for every guest and organizer regardless of
          who they are, rather than defaulting to one gender's likeness
          the way most hospitality stock photography does. A row of
          successive open doors receding into warm golden light — a
          literal match for the "كل دعوة... باب مفتوح" headline, with no
          venue signage or branding in frame (the earlier photo's small
          hotel plaque was the reason for this swap). Free-licensed
          (Unsplash), not a stock image of a specific business and not a
          generated one. Dark gradient scrim keeps the cream headline
          legible over the doorway detail without flattening the photo
          into a plain color block. */}
      <section className="relative flex min-h-[88vh] items-center justify-center overflow-hidden">
        <Image
          src={heroDoorway}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: 'center 65%' }}
        />
        <div
          aria-hidden
          className="from-foreground/95 via-foreground/70 to-foreground/45 absolute inset-0 bg-gradient-to-t"
        />
        <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 text-center sm:px-6">
          <span className="text-primary-foreground/90 flex items-center gap-2 text-sm font-semibold">
            <span className="bg-primary-foreground/60 h-px w-6" />
            {t('eyebrow')}
            <span className="bg-primary-foreground/60 h-px w-6" />
          </span>
          {/* One solid color for the whole headline, not a two-tone accent
              split — a photo backdrop is the wrong place to run an accent
              color against, since whatever's directly behind each letter
              (dark wood, warm stone, deep shadow) shifts how identical rust
              pixels actually read, no matter how uniform the CSS color
              value is. The accent color still does its job everywhere else
              on the page, on plain backgrounds where it reads cleanly. */}
          <h1 className="font-display text-primary-foreground text-4xl leading-[1.3] text-balance drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] sm:text-6xl">
            {t('headlineLine1')} {t('headlineLine2')}
          </h1>
          <p className="text-primary-foreground/85 max-w-xl text-lg text-balance">
            {t('subtitle')}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              variant="secondary"
              nativeButton={false}
              render={<Link href="/try" />}
            >
              {t('primaryCta')}
            </Button>
          </div>
        </div>
      </section>

      {/* Two real products, presented as a quiet icon-led list rather than
          a pair of boxed cards — no borders/background, just an icon,
          label, title, description, and the actual next step, separated
          by a single hairline between the two rows. Both rows share the
          same primary color now (not split rust-vs-teal per track) —
          one consistent accent across the page. */}
      <section className="py-14 sm:py-20">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          <div className="mb-10 flex flex-col gap-2">
            <span className="text-primary text-sm font-semibold">{tw('eyebrow')}</span>
            <h2 className="font-display text-2xl sm:text-3xl">{tw('title')}</h2>
          </div>

          <div className="flex flex-col">
            {JOURNEY_KEYS.map((key, index) => {
              const style = JOURNEY_STYLE[key];
              const Icon = style.icon;

              return (
                <Link
                  key={key}
                  href={style.href}
                  className={`hover-glow group text-primary grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-xl py-6 ${index > 0 ? 'border-border/60 border-t' : ''}`}
                >
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-current/10 ring-1 ring-current/20">
                    <Icon className="size-5" />
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="text-xs font-semibold tracking-wide">
                      {tt(`${key}.title`)}
                    </span>
                    <span className="font-display text-foreground text-lg sm:text-xl">
                      {tt(`${key}.description`)}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {tt(`${key}.feature1`)} · {tt(`${key}.feature2`)} · {tt(`${key}.feature3`)}
                    </span>
                  </span>
                  <span className="hidden items-center gap-1.5 text-sm font-semibold sm:flex">
                    {tt('ctaStart')}
                    <ArrowIcon className="size-4 transition-transform ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
