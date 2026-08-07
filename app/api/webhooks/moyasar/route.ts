import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notifyOrganizerTicketPurchase, sendBuyerTickets } from '@/lib/email/notify';
import { sendBuyerTicketsWhatsApp } from '@/lib/whatsapp/notify';

/**
 * Moyasar calls this when a payment against one of our invoices completes
 * (success or failure) — this is the ONLY place tickets actually get
 * created for a real-money purchase; the buyer's browser only ever creates
 * a *pending* order (see create_pending_ticket_order in
 * 20260807000014_moyasar_ticket_orders.sql).
 *
 * Configure this URL in the Moyasar dashboard: Settings → Webhooks →
 * `https://<your-domain>/api/webhooks/moyasar`, with a secret token that
 * matches `MOYASAR_WEBHOOK_SECRET`.
 *
 * ⚠️ Moyasar's exact webhook payload shape should be double-checked against
 * a real event once connected — this reads a few of their documented field
 * names defensively, but hasn't been exercised against a live webhook call
 * (that requires a real Moyasar account, which this environment doesn't
 * have). If the shapes below don't match what your dashboard sends, check
 * `console.error('[moyasar webhook] unrecognized payload', body)` in your
 * deployment logs and adjust `extractOrderId`/`extractStatus`.
 */

type MoyasarWebhookBody = {
  secret_token?: string;
  type?: string;
  status?: string;
  metadata?: Record<string, unknown>;
  data?: {
    id?: string;
    status?: string;
    metadata?: Record<string, unknown>;
  };
};

function extractOrderId(body: MoyasarWebhookBody): string | null {
  const fromData = body.data?.metadata?.order_id;
  const fromRoot = body.metadata?.order_id;
  const id = fromData ?? fromRoot;
  return typeof id === 'string' ? id : null;
}

function extractStatus(body: MoyasarWebhookBody): string | null {
  return body.data?.status ?? body.status ?? null;
}

const PAID_STATUSES = new Set(['paid', 'captured', 'authorized']);
const FAILED_STATUSES = new Set(['failed', 'expired', 'voided', 'refunded']);

export async function POST(request: NextRequest) {
  const secret = process.env.MOYASAR_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[moyasar webhook] MOYASAR_WEBHOOK_SECRET is not set — rejecting');
    return NextResponse.json({ error: 'not configured' }, { status: 500 });
  }

  let body: MoyasarWebhookBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  if (body.secret_token !== secret) {
    return NextResponse.json({ error: 'invalid secret token' }, { status: 401 });
  }

  const orderId = extractOrderId(body);
  const status = extractStatus(body);

  if (!orderId) {
    console.error('[moyasar webhook] could not find order_id in payload', body);
    return NextResponse.json({ error: 'unrecognized payload' }, { status: 400 });
  }

  const admin = createAdminClient();

  if (status && PAID_STATUSES.has(status)) {
    const { error } = await admin.rpc('confirm_ticket_order', {
      p_order_id: orderId,
      p_payment_reference: body.data?.id ?? orderId,
    });

    if (error) {
      // Most likely cause: the ticket type sold out to another order while
      // this one was pending (see the trade-off note in the migration).
      // Mark it failed so the buyer isn't left in limbo — refund via the
      // Moyasar dashboard/API is a manual follow-up for now.
      console.error('[moyasar webhook] confirm_ticket_order failed', error);
      await admin.rpc('fail_ticket_order', { p_order_id: orderId });
      return NextResponse.json({ error: 'could not confirm order' }, { status: 409 });
    }

    const { data: order } = await admin
      .from('ticket_orders')
      .select(
        'buyer_name, buyer_email, buyer_phone, quantity, event_id, events(slug, primary_locale)',
      )
      .eq('id', orderId)
      .single();

    if (order) {
      const eventSlug = (order.events as unknown as { slug: string } | null)?.slug;
      const locale =
        ((order.events as unknown as { primary_locale: string } | null)?.primary_locale as
          'ar' | 'en') ?? 'ar';

      if (eventSlug) {
        await notifyOrganizerTicketPurchase(eventSlug, order.buyer_name, order.quantity ?? 1);

        if (order.buyer_email || order.buyer_phone) {
          const { data: tickets } = await admin
            .from('tickets')
            .select('qr_token')
            .eq('order_id', orderId);
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
          const ticketUrls = (tickets ?? []).map(
            (t) => `${appUrl}/${locale}/tickets/${t.qr_token}`,
          );
          if (order.buyer_email) {
            await sendBuyerTickets(eventSlug, order.buyer_email, ticketUrls, locale);
          }
          if (order.buyer_phone) {
            await sendBuyerTicketsWhatsApp(eventSlug, order.buyer_phone, ticketUrls, locale);
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  }

  if (status && FAILED_STATUSES.has(status)) {
    await admin.rpc('fail_ticket_order', { p_order_id: orderId });
    return NextResponse.json({ ok: true });
  }

  // Unrecognized status — acknowledge without acting so Moyasar doesn't
  // retry indefinitely; the order stays pending.
  return NextResponse.json({ ok: true, note: 'status not acted on' });
}
