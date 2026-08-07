import type { PaymentProvider } from './provider';

/**
 * Confirms payment instantly and issues tickets in the same call — see the
 * `purchase_tickets_mock` note in 20260807000008_rpc_public_actions.sql for
 * how a real provider's create-pending / webhook-confirms flow would differ.
 */
export const mockPaymentProvider: PaymentProvider = {
  name: 'mock',
  async purchaseTickets(supabase, params) {
    const { data, error } = await supabase.rpc('purchase_tickets_mock', {
      p_event_slug: params.eventSlug,
      p_ticket_type_id: params.ticketTypeId,
      p_quantity: params.quantity,
      p_buyer_name: params.buyerName,
      p_buyer_email: params.buyerEmail,
      p_buyer_phone: params.buyerPhone,
    });

    if (error) throw error;

    const result = data as unknown as {
      order_id: string;
      total_amount: number;
      tickets: { id: string; qr_token: string }[];
    };

    return {
      status: 'confirmed',
      orderId: result.order_id,
      totalAmount: result.total_amount,
      tickets: result.tickets.map((t) => ({ id: t.id, qrToken: t.qr_token })),
    };
  },
};
