import { mockPaymentProvider } from './mock-provider';
import { moyasarPaymentProvider } from './moyasar-provider';
import type { PaymentProvider } from './provider';

export function isMoyasarConfigured(): boolean {
  return Boolean(process.env.MOYASAR_SECRET_KEY);
}

// Every caller goes through this single export, so connecting a real
// provider is a one-env-var change — nothing else in the app needs to know
// which provider is active.
export const paymentProvider: PaymentProvider = isMoyasarConfigured()
  ? moyasarPaymentProvider
  : mockPaymentProvider;

export type { PaymentProvider, PurchaseTicketsParams, PurchaseTicketsResult } from './provider';
