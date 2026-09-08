import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { TryDemoForm } from '@/components/public/try-demo-form';
import heroDoorway from '@/public/images/marketing/hero-doorway.jpg';

export async function HeroJourneys() {
  const t = await getTranslations('HomePage.hero');
  const tTry = await getTranslations('TryDemo');

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
    <section className="relative flex min-h-[68vh] items-center justify-center overflow-hidden">
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
        <p className="text-primary-foreground/85 max-w-xl text-lg text-balance">{t('subtitle')}</p>
        {/* The strongest thing this product can say to a stranger is
            "you'll have one on WhatsApp in a few seconds" — and it was
            sitting a click away behind a button, on /try. Putting the
            real two-field form here says it and proves it in the same
            breath, and fills what was otherwise a tall stretch of dead
            scrim under the headline. */}
        <div className="bg-card/95 w-full max-w-md rounded-2xl p-5 text-start shadow-2xl backdrop-blur-sm sm:p-6">
          <p className="font-display text-lg">{tTry('heroTitle')}</p>
          <p className="text-muted-foreground mt-1 mb-4 text-sm">{tTry('heroSubtitle')}</p>
          <TryDemoForm />
        </div>
      </div>
    </section>
  );
}
