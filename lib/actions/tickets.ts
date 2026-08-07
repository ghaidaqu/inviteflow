'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { ticketTypeFormSchema, purchaseFormSchema } from '@/lib/validations/tickets';
import { getCurrentOrganizationId, getEvent } from '@/lib/services/events.service';
import {
  createTicketType,
  updateTicketType,
  softDeleteTicketType,
} from '@/lib/services/tickets.service';
import { paymentProvider } from '@/lib/payments';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { notifyOrganizerTicketPurchase, sendBuyerTickets } from '@/lib/email/notify';
import { sendBuyerTicketsWhatsApp } from '@/lib/whatsapp/notify';

export type TicketTypeActionState = {
  error?: string;
};

function readTicketTypeInput(formData: FormData) {
  return {
    nameAr: formData.get('nameAr'),
    nameEn: formData.get('nameEn'),
    price: formData.get('price'),
    currency: formData.get('currency') || 'SAR',
    quantityTotal: formData.get('quantityTotal'),
    maxPerOrder: formData.get('maxPerOrder'),
    saleStartAt: formData.get('saleStartAt'),
    saleEndAt: formData.get('saleEndAt'),
    status: formData.get('status'),
  };
}

export async function createTicketTypeAction(
  eventId: string,
  _prevState: TicketTypeActionState,
  formData: FormData,
): Promise<TicketTypeActionState> {
  const parsed = ticketTypeFormSchema.safeParse(readTicketTypeInput(formData));
  if (!parsed.success) return { error: 'invalidInput' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthorized' };

  const organizationId = await getCurrentOrganizationId(supabase, user.id);
  if (!organizationId) return { error: 'unknown' };

  const event = await getEvent(supabase, organizationId, eventId);
  if (!event) return { error: 'unknown' };

  try {
    await createTicketType(supabase, eventId, parsed.data);
  } catch {
    return { error: 'unknown' };
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/events/${eventId}/tickets`);
  return {};
}

export async function updateTicketTypeAction(
  eventId: string,
  ticketTypeId: string,
  _prevState: TicketTypeActionState,
  formData: FormData,
): Promise<TicketTypeActionState> {
  const parsed = ticketTypeFormSchema.safeParse(readTicketTypeInput(formData));
  if (!parsed.success) return { error: 'invalidInput' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthorized' };

  const organizationId = await getCurrentOrganizationId(supabase, user.id);
  if (!organizationId) return { error: 'unknown' };

  const event = await getEvent(supabase, organizationId, eventId);
  if (!event) return { error: 'unknown' };

  try {
    await updateTicketType(supabase, eventId, ticketTypeId, parsed.data);
  } catch {
    return { error: 'unknown' };
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/events/${eventId}/tickets`);
  return {};
}

export async function deleteTicketTypeAction(eventId: string, ticketTypeId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const organizationId = await getCurrentOrganizationId(supabase, user.id);
  if (!organizationId) return;

  await softDeleteTicketType(supabase, eventId, ticketTypeId);

  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/events/${eventId}/tickets`);
}

export type PurchaseActionState = {
  error?: string;
  orderId?: string;
  tickets?: { id: string; qrToken: string }[];
};

export async function purchaseTicketsAction(
  eventSlug: string,
  _prevState: PurchaseActionState,
  formData: FormData,
): Promise<PurchaseActionState> {
  if (!isSupabaseConfigured()) return { error: 'notConfigured' };

  const parsed = purchaseFormSchema.safeParse({
    ticketTypeId: formData.get('ticketTypeId'),
    quantity: formData.get('quantity'),
    buyerName: formData.get('buyerName'),
    buyerEmail: formData.get('buyerEmail'),
    buyerPhone: formData.get('buyerPhone'),
  });

  if (!parsed.success) return { error: 'invalidInput' };

  const supabase = await createClient();

  const allowed = await checkRateLimit(supabase, {
    action: 'tickets',
    scope: eventSlug,
    maxHits: 3,
    windowSeconds: 60,
  });
  if (!allowed) return { error: 'rateLimited' };

  try {
    const result = await paymentProvider.purchaseTickets(supabase, {
      eventSlug,
      ticketTypeId: parsed.data.ticketTypeId,
      quantity: parsed.data.quantity,
      buyerName: parsed.data.buyerName,
      buyerEmail: parsed.data.buyerEmail ?? null,
      buyerPhone: parsed.data.buyerPhone ?? null,
    });

    if (result.status === 'pending') {
      // Real gateway (Moyasar): send the buyer to hosted checkout. Tickets
      // are only issued once the webhook confirms payment — see
      // app/api/webhooks/moyasar/route.ts.
      redirect(result.redirectUrl);
    }

    // Mock provider confirms instantly — notify right away.
    await notifyOrganizerTicketPurchase(eventSlug, parsed.data.buyerName, parsed.data.quantity);
    if (parsed.data.buyerEmail || parsed.data.buyerPhone) {
      const locale = (await getLocale()) as 'ar' | 'en';
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
      const ticketUrls = result.tickets.map((t) => `${appUrl}/${locale}/tickets/${t.qrToken}`);
      if (parsed.data.buyerEmail) {
        await sendBuyerTickets(eventSlug, parsed.data.buyerEmail, ticketUrls, locale);
      }
      if (parsed.data.buyerPhone) {
        await sendBuyerTicketsWhatsApp(eventSlug, parsed.data.buyerPhone, ticketUrls, locale);
      }
    }

    return { orderId: result.orderId, tickets: result.tickets };
  } catch (error) {
    // `redirect()` throws internally by design — let that propagate instead
    // of turning it into a "purchase failed" error state.
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error;
    return { error: 'purchaseFailed' };
  }
}
