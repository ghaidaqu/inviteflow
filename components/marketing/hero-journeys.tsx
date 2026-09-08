import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import heroDoorway from '@/public/images/marketing/hero-doorway.jpg';

export async function HeroJourneys() {
  const t = await getTranslations('HomePage.hero');

  // Full-bleed photo hero — an entrance, not a person, so the image reads
  // as "welcome" for every guest and organizer regardless of who they
  // are, rather than defaulting to one gender's likeness the way most
  // hospitality stock photography does. A row of successive open doors
  // receding into warm golden light — a literal match for the "كل
  // دعوة... باب مفتوح" headline, with no venue signage or branding in
  // frame (the earlier photo's small hotel plaque was the reason for this
  // swap). Free-licensed (Unsplash), not a stock image of a specific
  // business and not a generated one. The dark gradient scrim keeps the
  // cream headline legible over the doorway detail without flattening the
  // photo into a plain color block.
  return (
    <section className="relative flex min-h-[56vh] items-center justify-center overflow-hidden">
      <Image
        src={heroDoorway}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
        style={{ objectPosition: 'center 50%' }}
      />
      <div
        aria-hidden
        className="from-foreground/95 via-foreground/70 to-foreground/45 absolute inset-0 bg-gradient-to-t"
      />
      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-4 text-center sm:px-6">
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
        <p className="text-primary-foreground/85 max-w-xl text-lg text-balance">{t('subtitle')}</p>
        {/* A form card here covered the photograph and made the opening
            feel busy — the try-it hook earns its own calm section further
            down (TryBand) instead, and the hero goes back to doing the
            one thing it does well. */}
        <Button
          size="lg"
          variant="secondary"
          className="mt-1 px-10"
          nativeButton={false}
          render={<Link href="#options" />}
        >
          {t('primaryCta')}
        </Button>
      </div>
    </section>
  );
}
