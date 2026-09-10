'use client';

import { useState } from 'react';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  InfoIcon,
  ShieldCheckIcon,
  UsersIcon,
} from 'lucide-react';
import { RiyalSign } from '@/components/riyal-sign';
import { Switch } from '@/components/ui/switch';
import { Link } from '@/i18n/navigation';

/**
 * Price by guest count, for the digital-invitation track only — the link
 * track has no per-guest send, so a per-guest price would be meaningless
 * there.
 *
 * The tiers are the shape the pricing will take: one flat price up to a
 * ceiling, so an organizer sending 180 invitations pays the 200 price
 * rather than being metered. They are keyed on invitations sent, not on
 * guests named, because the reserve invitations go out too.
 *
 * **The amounts are deliberately 0** — the numbers aren't decided yet, and
 * this ships the calculator so only the table below has to change when
 * they are. Nothing else in the component needs touching.
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

/** Spare invitations held back for the reserve list — one in ten, which
 *  is about the decline rate an event this size plans around. */
const RESERVE_RATE = 0.1;

export type PriceCalculatorCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  guestsLabel: string;
  guestsUnit: string;
  decrease: string;
  increase: string;
  reserveLabel: string;
  reserveHint: string;
  reserveAdded: string;
  totalLabel: string;
  totalUnit: string;
  priceLabel: string;
  pending: string;
  cta: string;
  includes: string;
};

function priceFor(invitations: number) {
  return (TIERS.find((tier) => invitations <= tier.upTo) ?? TIERS[TIERS.length - 1]).price;
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
  const [guests, setGuests] = useState(300);
  const [withReserve, setWithReserve] = useState(true);
  const ArrowIcon = locale === 'ar' ? ArrowLeftIcon : ArrowRightIcon;
  const clamp = (value: number) => Math.min(MAX, Math.max(MIN, value));

  const reserve = withReserve ? Math.round(guests * RESERVE_RATE) : 0;
  const invitations = guests + reserve;
  const price = priceFor(invitations);

  const stepButton =
    'text-primary bg-primary/8 hover:bg-primary/15 focus-visible:ring-ring flex size-12 shrink-0 items-center justify-center rounded-full text-2xl leading-none transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-30';

  return (
    <section id="pricing" className="scroll-mt-24">
      <div className="text-center">
        <span className="bg-primary/40 mx-auto block h-px w-10" />
        <p className="text-primary mt-4 text-sm font-semibold tracking-wide">{copy.eyebrow}</p>
        {/* The heading carries this section — it is the question every
            visitor arrives with. Sized like one, not like a caption. */}
        <h3 className="font-display mt-2 text-3xl font-bold text-balance sm:text-4xl">
          {copy.title}
        </h3>
        <p className="text-muted-foreground mx-auto mt-3 max-w-md text-base">{copy.subtitle}</p>
      </div>

      <div className="border-border/60 bg-card/60 mt-10 rounded-[2rem] border p-4 shadow-sm sm:p-6">
        <div className="grid md:grid-cols-2">
          <div className="flex flex-col items-center gap-4 px-2 py-8 sm:px-6 md:pe-10">
            <span className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-full">
              <UsersIcon className="size-6" />
            </span>
            <label htmlFor="price-guests" className="text-lg font-semibold">
              {copy.guestsLabel}
            </label>

            {/* Minus left, plus right in both directions — a number line
                doesn't mirror, and the approved design keeps it that way. */}
            <div className="border-border/70 bg-background flex w-full max-w-[21rem] items-center rounded-full border p-2 rtl:flex-row-reverse">
              <button
                type="button"
                aria-label={copy.decrease}
                onClick={() => setGuests((value) => clamp(value - STEP))}
                disabled={guests <= MIN}
                className={stepButton}
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
                className="font-display w-full min-w-0 [appearance:textfield] border-0 bg-transparent text-center text-4xl font-bold tabular-nums focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <button
                type="button"
                aria-label={copy.increase}
                onClick={() => setGuests((value) => clamp(value + STEP))}
                disabled={guests >= MAX}
                className={stepButton}
              >
                +
              </button>
            </div>
            <p className="text-muted-foreground text-sm">{copy.guestsUnit}</p>

            {/* Spare invitations, priced up front. They are not extra
                guests — they go to the reserve list and are only sent once
                somebody declines, which is why the line below says "added"
                rather than "invited". */}
            <div className="mt-2 flex w-full max-w-[21rem] items-center justify-center gap-3">
              <span title={copy.reserveHint} className="text-primary/70 shrink-0">
                <InfoIcon className="size-4" />
                <span className="sr-only">{copy.reserveHint}</span>
              </span>
              <label htmlFor="price-reserve" className="cursor-pointer text-sm">
                {copy.reserveLabel}
              </label>
              <Switch id="price-reserve" checked={withReserve} onCheckedChange={setWithReserve} />
            </div>

            {/* Kept in the layout when it is off, so switching does not
                make the card jump by the height of one row. */}
            <p
              className={`bg-muted/50 text-muted-foreground flex w-full max-w-[21rem] items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm transition-opacity ${
                withReserve ? 'opacity-100' : 'opacity-0'
              }`}
              aria-hidden={!withReserve}
            >
              <span className="bg-primary text-primary-foreground flex size-5 shrink-0 items-center justify-center rounded-full">
                <CheckIcon className="size-3" />
              </span>
              <span className="tabular-nums">{reserve}</span> {copy.reserveAdded}
            </p>
          </div>

          {/* One hairline between the two halves on a wide screen, across
              them when they stack — the same seam either way. */}
          <div className="border-border/60 border-t pt-6 md:border-s md:border-t-0 md:ps-10 md:pt-0">
            <div className="bg-muted/30 flex h-full flex-col justify-center rounded-[1.5rem] px-6 py-8 text-center sm:px-8">
              <p className="text-muted-foreground text-sm">{copy.totalLabel}</p>
              <p className="font-display mt-1 text-5xl font-bold tabular-nums">{invitations}</p>
              <p className="text-muted-foreground mt-1 text-sm">{copy.totalUnit}</p>

              <hr className="border-border/60 mx-auto my-7 w-full max-w-[16rem]" />

              <p className="text-muted-foreground text-sm">{copy.priceLabel}</p>
              <p className="text-primary font-display mt-1 flex items-center justify-center gap-2 text-6xl font-bold tabular-nums">
                {price}
                <RiyalSign className="inline-block size-[0.42em] translate-y-[0.06em]" />
              </p>
              {/* Every tier is still 0. Left unexplained, a "0" price reads
                  as "free" — which is a claim, not a placeholder. */}
              <p className="text-muted-foreground mt-2 text-xs">{copy.pending}</p>

              <Link
                href={href}
                className="bg-primary text-primary-foreground focus-visible:ring-ring hover:bg-primary/90 mt-7 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold shadow-sm transition-colors focus-visible:ring-3 focus-visible:outline-none"
              >
                {copy.cta}
                <ArrowIcon className="size-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <p className="text-muted-foreground mt-5 flex items-center justify-center gap-2 text-center text-sm">
        <ShieldCheckIcon className="text-primary size-4 shrink-0" />
        {copy.includes}
      </p>
    </section>
  );
}
