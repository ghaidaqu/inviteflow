import { getTranslations } from 'next-intl/server';
import type { PriceCalculatorCopy } from '@/components/marketing/price-calculator';

/**
 * One place the calculator's strings are read, because the page shows it
 * twice — under the track choice and again near the bottom. Two hand-kept
 * lists would drift the first time a key was added to only one of them.
 */
export async function pricingCopy(): Promise<PriceCalculatorCopy> {
  const t = await getTranslations('HomePage.pricing');
  return {
    eyebrow: t('eyebrow'),
    title: t('title'),
    subtitle: t('subtitle'),
    guestsLabel: t('guestsLabel'),
    guestsUnit: t('guestsUnit'),
    decrease: t('decrease'),
    increase: t('increase'),
    reserveLabel: t('reserveLabel'),
    reserveFree: t('reserveFree'),
    reserveHint: t('reserveHint'),
    reserveAdded: t('reserveAdded'),
    totalLabel: t('totalLabel'),
    totalUnit: t('totalUnit'),
    priceLabel: t('priceLabel'),
    perGuest: t('perGuest'),
    contactPrice: t('contactPrice'),
    contactHint: t('contactHint'),
    cta: t('cta'),
    contactCta: t('contactCta'),
    includes: t('includes'),
  };
}
