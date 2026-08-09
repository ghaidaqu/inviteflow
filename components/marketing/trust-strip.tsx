import { getTranslations } from 'next-intl/server';
import { MessageCircleIcon, CreditCardIcon, QrCodeIcon, ShieldCheckIcon } from 'lucide-react';

const ITEMS = [
  { titleKey: 'item1Title', labelKey: 'item1Label', icon: MessageCircleIcon },
  { titleKey: 'item2Title', labelKey: 'item2Label', icon: CreditCardIcon },
  { titleKey: 'item3Title', labelKey: 'item3Label', icon: QrCodeIcon },
  { titleKey: 'item4Title', labelKey: 'item4Label', icon: ShieldCheckIcon },
] as const;

/**
 * A horizontal "highlights strip" right under the hero — visually plays
 * the same role as the reference's stats bar (10K+ organizers, 4.9★,
 * etc.), but with real, honest capability facts instead of invented usage
 * numbers. No fabricated metrics.
 */
export async function TrustStrip() {
  const t = await getTranslations('HomePage.trustStrip');

  return (
    <section className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <div className="border-border grid grid-cols-2 gap-6 rounded-2xl border px-6 py-7 sm:grid-cols-4 sm:gap-4">
        {ITEMS.map(({ titleKey, labelKey, icon: Icon }) => (
          <div key={titleKey} className="flex items-center gap-3">
            <Icon className="text-primary size-6 shrink-0" />
            <div>
              <p className="text-sm font-bold">{t(titleKey)}</p>
              <p className="text-muted-foreground text-xs">{t(labelKey)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
