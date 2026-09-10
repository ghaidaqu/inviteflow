'use client';

import { useState } from 'react';
import { ArrowLeftIcon, ArrowRightIcon, ShieldCheckIcon, UsersIcon } from 'lucide-react';
import { BrandMark } from '@/components/brand-mark';
import { Link } from '@/i18n/navigation';

/**
 * Price by guest count, for the digital-invitation track only — the link
 * track has no per-guest send, so a per-guest price would be meaningless
 * there.
 *
 * The tiers are the shape the pricing will take: one flat price up to a
 * ceiling, so an organizer who invites 180 people pays the 200 price
 * rather than being metered. **The amounts are deliberately 0** — the
 * numbers aren't decided yet, and this ships the calculator so only the
 * table below has to change when they are. Nothing else in the component
 * needs touching.
 */
const TIERS: Array<{ upTo: number; price: number }> = [
  { upTo: 50, price: 0 },
  { upTo: 100, price: 0 },
  { upTo: 200, price: 0 },
  { upTo: 400, price: 0 },
  { upTo: Number.POSITIVE_INFINITY, price: 0 },
];

const MIN = 50;
const MAX = 1000;
const STEP = 50;

export type PriceCalculatorCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  guestsLabel: string;
  guestsUnit: string;
  decrease: string;
  increase: string;
  totalLabel: string;
  totalUnit: string;
  priceLabel: string;
  currency: string;
  pending: string;
  cta: string;
  includes: string;
};

function priceFor(guests: number) {
  return (TIERS.find((tier) => guests <= tier.upTo) ?? TIERS[TIERS.length - 1]).price;
}

export function PriceCalculator({
  locale,
  href,
  copy,
}: {
  locale: string;
  href: string;
  copy: PriceCalculatorCopy;
}) {
  const [guests, setGuests] = useState(200);
  const ArrowIcon = locale === 'ar' ? ArrowLeftIcon : ArrowRightIcon;
  const price = priceFor(guests);
  const clamp = (value: number) => Math.min(MAX, Math.max(MIN, value));

  return (
    <section id="pricing" className="scroll-mt-20">
      <div className="text-center">
        <BrandMark className="mx-auto size-4" />
        <p className="text-primary mt-2 text-sm font-semibold">{copy.eyebrow}</p>
        <h3 className="font-display mt-1 text-xl sm:text-2xl">{copy.title}</h3>
        <p className="text-muted-foreground mt-2 text-sm">{copy.subtitle}</p>
      </div>

      <div className="border-border/70 bg-card/70 mt-6 grid gap-6 rounded-3xl border p-5 shadow-sm sm:p-7 md:grid-cols-2 md:gap-0">
        <div className="flex flex-col items-center justify-center gap-3 md:pe-7">
          <span className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-full">
            <UsersIcon className="size-5" />
          </span>
          <label htmlFor="price-guests" className="text-sm font-semibold">
            {copy.guestsLabel}
          </label>

          {/* Minus left, plus right in both directions — a number line
              doesn't mirror, and the approved design keeps it that way. */}
          <div className="border-border/70 bg-background flex w-full max-w-[19rem] items-center rounded-full border p-1.5 rtl:flex-row-reverse">
            <button
              type="button"
              aria-label={copy.decrease}
              onClick={() => setGuests((value) => clamp(value - STEP))}
              disabled={guests <= MIN}
              className="text-primary hover:bg-primary/10 focus-visible:ring-ring flex size-10 shrink-0 items-center justify-center rounded-full text-xl transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-35"
            >
              −
            </button>
            <input
              id="price-guests"
              type="number"
              inputMode="numeric"
              min={MIN}
              max={MAX}
              step={STEP}
              value={guests}
              onChange={(event) => setGuests(clamp(Number(event.target.value) || MIN))}
              className="font-display w-full min-w-0 [appearance:textfield] border-0 bg-transparent text-center text-3xl tabular-nums focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="button"
              aria-label={copy.increase}
              onClick={() => setGuests((value) => clamp(value + STEP))}
              disabled={guests >= MAX}
              className="text-primary hover:bg-primary/10 focus-visible:ring-ring flex size-10 shrink-0 items-center justify-center rounded-full text-xl transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-35"
            >
              +
            </button>
          </div>
          <p className="text-muted-foreground text-xs">{copy.guestsUnit}</p>
        </div>

        <div className="border-border/70 bg-muted/40 rounded-2xl border p-5 text-center md:ms-7">
          <p className="text-muted-foreground text-sm">{copy.totalLabel}</p>
          <p className="font-display mt-1 text-3xl tabular-nums">{guests}</p>
          <p className="text-muted-foreground text-xs">{copy.totalUnit}</p>

          <hr className="border-border/70 my-4" />

          <p className="text-muted-foreground text-sm">{copy.priceLabel}</p>
          <p className="text-primary font-display mt-1 flex items-baseline justify-center gap-1.5 text-4xl tabular-nums">
            {price}
            <span className="text-base font-normal">{copy.currency}</span>
          </p>
          {/* Every tier is still 0. Left unexplained, a "0" price reads as
              "free" — which is a claim, not a placeholder. */}
          <p className="text-muted-foreground mt-1 text-xs">{copy.pending}</p>

          <Link
            href={href}
            className="bg-primary text-primary-foreground focus-visible:ring-ring hover:bg-primary/90 mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold shadow-sm transition-colors focus-visible:ring-3 focus-visible:outline-none"
          >
            {copy.cta}
            <ArrowIcon className="size-4" />
          </Link>
        </div>
      </div>

      <p className="text-muted-foreground mt-4 flex items-center justify-center gap-2 text-center text-xs">
        <ShieldCheckIcon className="size-4 shrink-0" />
        {copy.includes}
      </p>
    </section>
  );
}
