import { getTranslations } from 'next-intl/server';
import { TrackOptionsSelector } from '@/components/marketing/track-options-selector';

type JourneyKey = 'invitation' | 'rsvp';

// Two real products, one color — both tracks read as the same brand
// (primary/rust) rather than being split rust-vs-teal, per explicit
// feedback that the two-color split made the page feel inconsistent.
//
// Goes straight into the wizard, no login first — see
// start/[track]/page.tsx: the wizard is open to anonymous visitors and
// only asks for an account at its very last step.
const JOURNEY_STYLE: Record<JourneyKey, { href: string }> = {
  invitation: { href: '/start/invitation' },
  rsvp: { href: '/start/rsvp' },
};

const JOURNEY_KEYS: JourneyKey[] = ['invitation', 'rsvp'];

/**
 * "Which of the two do I need?" — split out of HeroJourneys so the page
 * can put it where a visitor actually asks it: after they've seen what
 * the product looks like, not immediately under the hero.
 */
export async function TrackOptions({ locale }: { locale: string }) {
  const tw = await getTranslations('HomePage.ways');
  const tt = await getTranslations('HomePage.tracks');
  const tp = await getTranslations('HomePage.pricing');

  return (
    <section id="options" className="section-y scroll-mt-20">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        {/* Was an eyebrow + a title restating "دعوة رقمية، أو دعوة
            برابط" — redundant once the two rows right below already say
            exactly that, so this is just the one heading now. */}
        <h2 className="text-primary text-center text-xl font-bold sm:text-2xl">{tw('eyebrow')}</h2>
        {/* Says out loud that choosing is what reveals the price — the
            calculator lives inside the digital-invitation track, and with
            nothing selected the section looked like a site with no
            pricing at all. */}
        <p className="text-muted-foreground mt-2 mb-7 text-center text-sm">{tw('hint')}</p>

        <TrackOptionsSelector
          locale={locale}
          cta={tt('ctaStart')}
          pricing={{
            eyebrow: tp('eyebrow'),
            title: tp('title'),
            subtitle: tp('subtitle'),
            guestsLabel: tp('guestsLabel'),
            guestsUnit: tp('guestsUnit'),
            decrease: tp('decrease'),
            increase: tp('increase'),
            totalLabel: tp('totalLabel'),
            totalUnit: tp('totalUnit'),
            priceLabel: tp('priceLabel'),
            currency: tp('currency'),
            pending: tp('pending'),
            cta: tp('cta'),
            includes: tp('includes'),
          }}
          options={JOURNEY_KEYS.map((key) => ({
            key,
            href: JOURNEY_STYLE[key].href,
            badge: tt(`${key}.badge`),
            description: tt(`${key}.description`),
            features: [tt(`${key}.feature1`), tt(`${key}.feature2`), tt(`${key}.feature3`)],
          }))}
        />
      </div>
    </section>
  );
}
