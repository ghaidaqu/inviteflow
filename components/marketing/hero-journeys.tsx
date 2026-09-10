import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import heroArchway from '@/public/images/marketing/hero-archway.jpg';

export async function HeroJourneys() {
  const t = await getTranslations('HomePage.hero');

  // Full-bleed photo hero — an open archway onto a lit path, not a person,
  // so it reads as "welcome" for any guest or organizer rather than
  // defaulting to one gender's likeness the way most hospitality imagery
  // does. It is a generated image (the owner made it), which the previous
  // Unsplash photograph was not — worth stating plainly since the old
  // comment here claimed the opposite.
  //
  // It is also BRIGHT, and that changes the text treatment completely.
  // Measured against the band where the copy sits (mean rgb 180,149,124):
  // the old cream type scored 2.44:1 — under the floor for any size — and
  // dark ink scores 5.15:1. So the type is ink on a light veil now, not
  // cream on a dark scrim. The veil is deliberately weak: heavy enough to
  // steady the contrast, light enough to keep the airiness that made this
  // picture worth switching to.
  return (
    <section className="relative flex min-h-[60vh] items-center justify-center overflow-hidden sm:min-h-[68vh]">
      <Image
        src={heroArchway}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
        style={{ objectPosition: 'center 50%' }}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(to_top,rgb(237_226_200/0.72),rgb(237_226_200/0.38),rgb(237_226_200/0.16))]"
      />
      <div
        aria-hidden
        className="bg-background/28 absolute top-1/2 left-1/2 h-[72%] w-[min(92%,52rem)] -translate-x-1/2 -translate-y-1/2 rounded-[50%] blur-3xl"
      />
      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-4 text-center sm:gap-5 sm:px-6">
        <span className="text-primary flex items-center gap-2 text-sm font-semibold">
          <span className="bg-primary/50 h-px w-6" />
          {t('eyebrow')}
          <span className="bg-primary/50 h-px w-6" />
        </span>
        {/* Size has been tuned by eye on a real phone, not derived from a
            ratio: 24px on mobile, 48px from sm up. It went 60 → 36 → 60 →
            this, and the deciding view was the phone, where the headline
            has the least room and the photograph the most to lose.

            One solid color for the whole headline, not a two-tone accent
            split — a photo backdrop is the wrong place to run an accent
            color against, since whatever's directly behind each letter
            (dark wood, warm stone, deep shadow) shifts how identical rust
            pixels actually read, no matter how uniform the CSS color
            value is. The accent color still does its job everywhere else
            on the page, on plain backgrounds where it reads cleanly. */}
        <h1 className="font-display text-foreground text-[2rem] leading-[1.25] text-balance sm:text-6xl">
          {t('headlineLine1')} {t('headlineLine2')}
        </h1>
        <p className="text-foreground/80 max-w-xl text-lg text-balance">{t('subtitle')}</p>
        {/* A form card here covered the photograph and made the opening
            feel busy — the try-it hook earns its own calm section further
            down (TryBand) instead, and the hero goes back to doing the
            one thing it does well. */}
        <Button
          size="lg"
          className="text-primary mt-1 border border-white/70 bg-[rgb(248_243_236/0.46)] px-10 shadow-[0_8px_24px_rgb(56_38_22/0.12)] backdrop-blur-md hover:bg-[rgb(248_243_236/0.68)] hover:shadow-[0_12px_28px_rgb(56_38_22/0.18)]"
          nativeButton={false}
          render={<Link href="#options" />}
        >
          {t('primaryCta')}
        </Button>
        <p className="text-muted-foreground text-sm font-medium">{t('microcopy')}</p>
      </div>
    </section>
  );
}
