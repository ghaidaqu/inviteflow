import type { PaymentProvider } from './provider';

const MOYASAR_API_BASE = 'https://api.moyasar.com/v1';

function authHeader(secretKey: string): string {
  return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;
}

/**
 * Real Moyasar integration using their hosted Invoice checkout — the buyer
 * is redirected to a Moyasar-hosted page to enter card details, so raw card
 * data never touches this app (no PCI scope). Moyasar confirms payment
 * asynchronously by POSTing to the webhook route
 * (app/api/webhooks/moyasar/route.ts), which is what actually issues the
 * tickets via confirm_ticket_order().
 *
 * Needs `MOYASAR_SECRET_KEY` (Moyasar dashboard → API keys). Falls back to
 * the mock provider automatically when unset — see lib/payments/index.ts.
 */
export const moyasarPaymentProvider: PaymentProvider = {
  name: 'moyasar',
  async purchaseTickets(supabase, params) {
    const { data, error } = await supabase.rpc('create_pending_ticket_order', {
      p_event_slug: params.eventSlug,
      p_ticket_type_id: params.ticketTypeId,
      p_quantity: params.quantity,
      p_buyer_name: params.buyerName,
      p_buyer_email: params.buyerEmail,
      p_buyer_phone: params.buyerPhone,
    });
    if (error) throw error;

    const order = data as unknown as { order_id: string; total_amount: number; currency: string };
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    const secretKey = process.env.MOYASAR_SECRET_KEY;
    if (!secretKey) {
      // Should never happen — lib/payments/index.ts only selects this
      // provider when the key is present — but fail loudly rather than
      // silently charging nothing if it somehow does.
      throw new Error('MOYASAR_SECRET_KEY is not set');
    }

    const res = await fetch(`${MOYASAR_API_BASE}/invoices`, {
      method: 'POST',
      headers: {
        Authorization: authHeader(secretKey),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(order.total_amount * 100), // Moyasar uses halalas (SAR × 100)
        currency: order.currency,
        description: `${params.quantity}x ticket — ${params.eventSlug}`,
        success_url: `${appUrl}/events/${params.eventSlug}/tickets/success?order=${order.order_id}`,
        back_url: `${appUrl}/events/${params.eventSlug}/tickets`,
        metadata: { order_id: order.order_id },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Moyasar invoice creation failed (${res.status}): ${body}`);
    }

    const invoice = (await res.json()) as { id: string; url: string };

    return {
      status: 'pending',
      orderId: order.order_id,
      totalAmount: order.total_amount,
      redirectUrl: invoice.url,
    };
  },
};
