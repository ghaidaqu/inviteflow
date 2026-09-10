'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * The guest count, shared by every calculator on the page.
 *
 * There are two of them now — one under the track choice, one again near
 * the bottom for whoever read the whole page first. Two copies with their
 * own state would disagree the moment someone changed one: set 500 at the
 * top, scroll down, and the site quotes you for 300. So the number lives
 * here and both read it.
 */
type PricingState = {
  guests: number;
  setGuests: (value: number | ((previous: number) => number)) => void;
  withReserve: boolean;
  setWithReserve: (value: boolean) => void;
};

const PricingContext = createContext<PricingState | null>(null);

export function PricingProvider({
  children,
  defaultGuests = 300,
}: {
  children: ReactNode;
  defaultGuests?: number;
}) {
  const [guests, setGuests] = useState(defaultGuests);
  const [withReserve, setWithReserve] = useState(true);
  const value = useMemo(
    () => ({ guests, setGuests, withReserve, setWithReserve }),
    [guests, withReserve],
  );
  return <PricingContext.Provider value={value}>{children}</PricingContext.Provider>;
}

export function usePricingState(): PricingState {
  const value = useContext(PricingContext);
  if (!value) throw new Error('usePricingState must be used inside <PricingProvider>');
  return value;
}
