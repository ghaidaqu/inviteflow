import { getTranslations } from 'next-intl/server';
import { MessageCircleIcon, ClockIcon, UserCheckIcon, ShieldCheckIcon } from 'lucide-react';

const ITEMS = [
  { key: 'item1', icon: MessageCircleIcon },
  { key: 'item2', icon: ClockIcon },
  { key: 'item3', icon: UserCheckIcon },
  { key: 'item4', icon: ShieldCheckIcon },
] as const;

/**
 * The four things a first-time visitor most needs to hear, answered
 * before they've asked. The copy for these already existed in
 * messages/*.json (HomePage.trustStrip) but nothing rendered it — this is
 * that content finally on the page.
 *
 * Deliberately a thin band, not cards: it sits directly under a strong
 * photo hero, and anything heavier here would compete with it instead of
 * settling the doubts and getting out of the way.
 */
export async function TrustStrip() {
  const t = await getTranslations('HomePage.trustStrip');

  return (
    <section className="border-border/60 border-b">
      <div className="mx-auto grid w-full max-w-5xl grid-cols-2 gap-x-6 gap-y-7 px-4 py-8 sm:px-6 lg:grid-cols-4">
        {ITEMS.map(({ key, icon: Icon }) => (
          <div key={key} className="flex items-start gap-3">
            <Icon className="text-primary mt-0.5 size-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">{t(`${key}Title`)}</p>
              <p className="text-muted-foreground mt-0.5 text-sm">{t(`${key}Label`)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
