'use client';

import dynamic from 'next/dynamic';

/**
 * Recharts is ~110KB and renders one bar chart below the dashboard's stat
 * cards — the numbers a user actually comes for are already server-rendered
 * above it. Loading the chart on the client only keeps that weight out of
 * the dashboard's initial bundle.
 *
 * This wrapper exists because `ssr: false` can't be used from a Server
 * Component, and the dashboard page is one. The placeholder matches the
 * chart's height so nothing jumps when it swaps in.
 */
export const RsvpBreakdownChart = dynamic(
  () => import('./rsvp-breakdown-chart').then((m) => m.RsvpBreakdownChart),
  {
    ssr: false,
    loading: () => <div className="h-64 w-full animate-pulse rounded-xl" aria-hidden />,
  },
);
