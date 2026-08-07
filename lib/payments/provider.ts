import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export type PurchaseTicketsParams = {
  eventSlug: string;
  ticketTypeId: string;
  quantity: number;
  buyerName: string;
  buyerEmail: string | null;
  buyerPhone: string | null;
};

export type PurchaseTicketsResult = {
  orderId: string;
  totalAmount: number;
  tickets: { id: string; qrToken: string }[];
};

/**
 * Abstraction over ticket payment/checkout so a real provider (Stripe,
 * Moyasar) can replace `mockPaymentProvider` later without touching
 * callers — see lib/payments/index.ts for the active provider.
 */
export interface PaymentProvider {
  name: string;
  purchaseTickets(
    supabase: SupabaseClient<Database>,
    params: PurchaseTicketsParams,
  ): Promise<PurchaseTicketsResult>;
}
