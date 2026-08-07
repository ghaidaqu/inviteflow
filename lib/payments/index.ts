import { mockPaymentProvider } from './mock-provider';
import type { PaymentProvider } from './provider';

// Swap this to a real provider (Stripe/Moyasar) when one is implemented —
// every caller goes through this single export, so nothing else changes.
export const paymentProvider: PaymentProvider = mockPaymentProvider;

export type { PaymentProvider, PurchaseTicketsParams, PurchaseTicketsResult } from './provider';
