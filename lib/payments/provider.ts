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

/**
 * A provider either confirms and issues tickets synchronously (mock), or
 * has to send the buyer to a hosted checkout page and confirm later via
 * webhook once the gateway calls back (Moyasar). Callers must handle both:
 * on `pending`, redirect the browser to `redirectUrl`.
 */
export type PurchaseTicketsResult =
  | {
      status: 'confirmed';
      orderId: string;
      totalAmount: number;
      tickets: { id: string; qrToken: string }[];
    }
  | { status: 'pending'; orderId: string; totalAmount: number; redirectUrl: string };

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
