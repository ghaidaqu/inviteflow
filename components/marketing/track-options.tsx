import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { ArrowLeftIcon, ArrowRightIcon, MailIcon, LinkIcon } from 'lucide-react';

type JourneyKey = 'invitation' | 'rsvp';

// Two real products, one color — both tracks read as the same brand
// (primary/rust) rather than being split rust-vs-teal, per explicit
// feedback that the two-color split made the page feel inconsistent.
//
// Goes straight into the wizard, no login first — see
// start/[track]/page.tsx: the wizard is open to anonymous visitors and
// only asks for an account at its very last step.
const JOURNEY_STYLE: Record<JourneyKey, { href: string; icon: typeof MailIcon }> = {
  invitation: { href: '/start/invitation', icon: MailIcon },
  rsvp: { href: '/start/rsvp', icon: LinkIcon },
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
  const isRtl = locale === 'ar';
  const ArrowIcon = isRtl ? ArrowLeftIcon : ArrowRightIcon;

  // A quiet icon-led list rather than a pair of boxed cards — no
  // borders or background, just an icon, label, title, description and
  // the actual next step, separated by a single hairline between the two
  // rows. Both rows share the same primary color (not split rust-vs-teal
  // per track) — one consistent accent across the page.
  return (
    <section id="options" className="section-y scroll-mt-20">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        {/* Was an eyebrow + a title restating "دعوة رقمية، أو دعوة
            برابط" — redundant once the two rows right below already say
            exactly that, so this is just the one heading now. */}
        <h2 className="text-primary mb-6 text-lg font-bold sm:text-xl">{tw('eyebrow')}</h2>

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
                  <span className="text-xs font-semibold tracking-wide">{tt(`${key}.title`)}</span>
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
  );
}
