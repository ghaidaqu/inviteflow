'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeftIcon, ArrowRightIcon, LinkIcon, MailIcon } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { PriceCalculator, type PriceCalculatorCopy } from '@/components/marketing/price-calculator';

type JourneyKey = 'invitation' | 'rsvp';

type TrackOption = {
  key: JourneyKey;
  href: string;
  badge: string;
  description: string;
  features: string[];
};

const ICONS = {
  invitation: MailIcon,
  rsvp: LinkIcon,
} satisfies Record<JourneyKey, typeof MailIcon>;

export function TrackOptionsSelector({
  locale,
  cta,
  options,
  pricing,
}: {
  locale: string;
  cta: string;
  options: TrackOption[];
  pricing: PriceCalculatorCopy;
}) {
  const [selected, setSelected] = useState<JourneyKey | null>(null);
  const pricingRef = useRef<HTMLDivElement>(null);

  // The price only exists once a track is chosen, and it appears below
  // the fold on a phone — so choosing has to take the visitor to it.
  // Without this the calculator opened somewhere off-screen and read as
  // "there is no pricing on this site".
  useEffect(() => {
    if (selected !== 'invitation') return;
    pricingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selected]);
  const selectedOption = options.find((option) => option.key === selected);
  const ArrowIcon = locale === 'ar' ? ArrowLeftIcon : ArrowRightIcon;

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6" role="radiogroup">
        {options.map((option) => {
          const Icon = ICONS[option.key];
          const isSelected = selected === option.key;

          return (
            <button
              key={option.key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setSelected(option.key)}
              className={`bg-card/75 text-primary focus-visible:ring-ring/60 grid w-full grid-cols-[auto_1fr] items-center gap-4 rounded-2xl border p-5 text-start shadow-sm transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-3 focus-visible:outline-none sm:p-6 ${
                isSelected
                  ? 'border-secondary ring-secondary/35 ring-3'
                  : 'border-border/80 hover:border-secondary/70'
              }`}
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-current/10 ring-1 ring-current/20">
                <Icon className="size-5" />
              </span>
              <span className="grid min-w-0 grid-rows-[1.75rem_2.5rem_3.5rem] content-center gap-1">
                <span className="bg-primary/10 flex h-7 w-fit items-center rounded-full px-2.5 text-xs font-semibold tracking-wide">
                  {option.badge}
                </span>
                <span className="font-display text-foreground flex items-center text-lg leading-tight sm:text-xl">
                  {option.description}
                </span>
                <span className="text-muted-foreground flex items-start text-sm leading-relaxed">
                  {option.features.join(' · ')}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Price depends on how many guests are messaged, so the calculator
          belongs to the digital-invitation track and only to it — the link
          track sends nothing per guest. It carries its own call to action,
          so the plain one below is for the other track. */}
      {selectedOption?.key === 'invitation' && (
        <div ref={pricingRef} className="mt-8 scroll-mt-24">
          <PriceCalculator locale={locale} href={selectedOption.href} copy={pricing} />
        </div>
      )}

      {selectedOption && selectedOption.key !== 'invitation' && (
        <div className="mt-5 flex justify-center">
          <Link
            href={selectedOption.href}
            className="bg-primary text-primary-foreground focus-visible:ring-ring hover:bg-primary/90 inline-flex min-h-11 items-center gap-2 rounded-lg px-8 py-2.5 text-sm font-semibold shadow-sm transition-colors focus-visible:ring-3 focus-visible:outline-none"
          >
            {cta}
            <ArrowIcon className="size-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
