'use client';

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
import { usePricingState } from '@/components/marketing/pricing-state';

/**
 * Price by guest count, for the digital-invitation track only — the link
 * track has no per-guest send, so a per-guest price would be meaningless
 * there.
 *
 * One flat price up to a ceiling rather than a per-head meter: an
 * organizer inviting 180 pays the 200 price. The numbers are the ones
 * Sultan set — 50/249, 100/449, 200/749, 400/1299 — and they are keyed
 * on **guests**, the way that table is written, not on invitations sent.
 * That matters: 50 guests with the 10% reserve is 55 invitations, and
 * pricing those 55 against the 100-guest tier would charge someone the
 * next bracket up for a box they ticked. The reserve rides along free.
 *
 * Above 400 the price is deliberately absent — no bracket was set that
 * high, and inventing one would put a number on the site that nobody
 * decided. That case sends the organizer to the institutional route.
 */
const TIERS: Array<{ upTo: number; price: number | null }> = [
  { upTo: 50, price: 249 },
  { upTo: 100, price: 449 },
  { upTo: 200, price: 749 },
  { upTo: 400, price: 1299 },
  { upTo: Number.POSITIVE_INFINITY, price: null },
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
  reserveFree: string;
  reserveHint: string;
  reserveAdded: string;
  totalLabel: string;
  totalUnit: string;
  priceLabel: string;
  perGuest: string;
  contactPrice: string;
  contactHint: string;
  cta: string;
  contactCta: string;
  includes: string;
};

function priceFor(guests: number) {
  return (TIERS.find((tier) => guests <= tier.upTo) ?? TIERS[TIERS.length - 1]).price;
}

/** What it works out to per guest — the figure an organizer actually
 *  compares against a competitor. One decimal, and no trailing ".0". */
function perGuest(price: number, guests: number) {
  return (Math.round((price / guests) * 10) / 10).toString();
}

export function PriceCalculator({
  locale,
  href,
  copy,
  id,
  idPrefix,
  compact,
}: {
  locale: string;
  href: string;
  copy: PriceCalculatorCopy;
  /** Only one of the two calculators owns the #pricing anchor. */
  id?: string;
  /** Keeps the input and its label paired when both are on the page. */
  idPrefix: string;
  /** The copy under the track choice, where this opens inside a section
   *  that already has its own heading and is followed by the rest of the
   *  page. Same calculator, dialled down so it reads as one step rather
   *  than taking the whole screen. The full-size one lives near the end. */
  compact?: boolean;
}) {
  const { guests, setGuests, withReserve, setWithReserve } = usePricingState();
  const ArrowIcon = locale === 'ar' ? ArrowLeftIcon : ArrowRightIcon;
  const clamp = (value: number) => Math.min(MAX, Math.max(MIN, value));

  const reserve = withReserve ? Math.round(guests * RESERVE_RATE) : 0;
  const invitations = guests + reserve;
  const price = priceFor(guests);

  const stepButton = `text-primary bg-primary/8 hover:bg-primary/15 focus-visible:ring-ring flex ${
    compact ? 'size-9 text-xl' : 'size-12 text-2xl'
  } shrink-0 items-center justify-center rounded-full leading-none transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-30`;

  return (
    <section id={id} className="scroll-mt-24">
      {compact ? (
        // No second big heading here: the section above already says
        // "choose how to invite", and repeating a 36px title inside it
        // made the choice feel like it had landed on a whole new page.
        <p className="text-muted-foreground text-center text-sm">{copy.subtitle}</p>
      ) : (
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
      )}

      <div
        className={`border-border/60 bg-card/60 border shadow-sm ${
          compact ? 'mt-4 rounded-3xl p-3 sm:p-4' : 'mt-10 rounded-[2rem] p-4 sm:p-6'
        }`}
      >
        <div className="grid md:grid-cols-2">
          <div
            className={`flex flex-col items-center px-2 sm:px-6 ${
              compact ? 'gap-3 py-4 md:pe-7' : 'gap-4 py-8 md:pe-10'
            }`}
          >
            <span
              className={`bg-primary/10 text-primary flex items-center justify-center rounded-full ${
                compact ? 'size-10' : 'size-14'
              }`}
            >
              <UsersIcon className={compact ? 'size-5' : 'size-6'} />
            </span>
            <label
              htmlFor={`${idPrefix}-guests`}
              className={compact ? 'text-base font-semibold' : 'text-lg font-semibold'}
            >
              {copy.guestsLabel}
            </label>

            {/* Minus left, plus right in both directions — a number line
                doesn't mirror, and the approved design keeps it that way. */}
            <div
              className={`border-border/70 bg-background flex w-full items-center rounded-full border rtl:flex-row-reverse ${
                compact ? 'max-w-[17rem] p-1.5' : 'max-w-[21rem] p-2'
              }`}
            >
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
                id={`${idPrefix}-guests`}
                type="number"
                inputMode="numeric"
                min={MIN}
                max={MAX}
                step={STEP}
                value={guests}
                onChange={(event) => setGuests(clamp(Number(event.target.value) || MIN))}
                className={`font-display w-full min-w-0 [appearance:textfield] border-0 bg-transparent text-center font-bold tabular-nums focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                  compact ? 'text-3xl' : 'text-4xl'
                }`}
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
            <div
              className={`flex w-full items-center justify-center gap-3 ${
                compact ? 'mt-1 max-w-[17rem]' : 'mt-2 max-w-[21rem]'
              }`}
            >
              <span title={copy.reserveHint} className="text-primary shrink-0">
                <InfoIcon className="size-4" />
                <span className="sr-only">{copy.reserveHint}</span>
              </span>
              <label
                htmlFor={`${idPrefix}-reserve`}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                {copy.reserveLabel}
                <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-semibold">
                  {copy.reserveFree}
                </span>
              </label>
              <Switch
                id={`${idPrefix}-reserve`}
                checked={withReserve}
                onCheckedChange={setWithReserve}
              />
            </div>

            {/* Kept in the layout when it is off, so switching does not
                make the card jump by the height of one row. */}
            <p
              className={`bg-muted/50 text-muted-foreground flex w-full items-center justify-center gap-2 rounded-xl transition-opacity ${
                compact ? 'max-w-[17rem] px-3 py-2 text-xs' : 'max-w-[21rem] px-4 py-3 text-sm'
              } ${withReserve ? 'opacity-100' : 'opacity-0'}`}
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
          <div
            className={`border-border/60 border-t md:border-s md:border-t-0 md:pt-0 ${
              compact ? 'pt-4 md:ps-7' : 'pt-6 md:ps-10'
            }`}
          >
            <div
              className={`bg-muted/30 flex h-full flex-col justify-center text-center ${
                compact ? 'rounded-2xl px-4 py-5 sm:px-6' : 'rounded-[1.5rem] px-6 py-8 sm:px-8'
              }`}
            >
              <p className="text-muted-foreground text-sm">{copy.totalLabel}</p>
              <p
                className={`font-display mt-1 font-bold tabular-nums ${
                  compact ? 'text-3xl' : 'text-5xl'
                }`}
              >
                {invitations}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">{copy.totalUnit}</p>

              <hr
                className={`border-border/60 mx-auto w-full max-w-[16rem] ${compact ? 'my-4' : 'my-7'}`}
              />

              <p className="text-muted-foreground text-sm">{copy.priceLabel}</p>
              {price === null ? (
                <>
                  <p className="text-primary font-display mt-1 text-4xl font-bold">
                    {copy.contactPrice}
                  </p>
                  <p className="text-muted-foreground mt-2 text-xs">{copy.contactHint}</p>
                </>
              ) : (
                <>
                  <p
                    className={`text-primary font-display mt-1 flex items-center justify-center gap-2 font-bold tabular-nums ${
                      compact ? 'text-4xl' : 'text-6xl'
                    }`}
                  >
                    {price}
                    <RiyalSign className="inline-block size-[0.42em] translate-y-[0.06em]" />
                  </p>
                  {/* The number an organizer compares against a quote from
                      anyone else, so it is worked out for them. */}
                  <p className="text-muted-foreground mt-2 text-xs">
                    ≈ <span className="tabular-nums">{perGuest(price, guests)}</span>{' '}
                    <RiyalSign className="inline-block size-[0.85em] translate-y-[0.1em]" />{' '}
                    {copy.perGuest}
                  </p>
                </>
              )}

              <Link
                href={price === null ? '/institutional' : href}
                className={`bg-primary text-primary-foreground focus-visible:ring-ring hover:bg-primary/90 inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 font-semibold shadow-sm transition-colors focus-visible:ring-3 focus-visible:outline-none ${
                  compact ? 'mt-4 min-h-11 text-sm' : 'mt-7 min-h-13 text-base'
                }`}
              >
                {price === null ? copy.contactCta : copy.cta}
                <ArrowIcon className="size-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <p
        className={`text-muted-foreground flex items-center justify-center gap-2 text-center ${
          compact ? 'mt-3 text-xs' : 'mt-5 text-sm'
        }`}
      >
        <ShieldCheckIcon className="text-primary size-4 shrink-0" />
        {copy.includes}
      </p>
    </section>
  );
}
