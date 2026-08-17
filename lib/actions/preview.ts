'use server';

import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { normalizePhone } from '@/lib/utils/phone';
import { whatsAppProvider, isWhatsAppConfigured } from '@/lib/whatsapp';

export type PreviewSendState = {
  error?: string;
  sent?: boolean;
  /** false in demo/unconfigured environments — the send was logged, not
   *  actually delivered. The UI should say so rather than implying it went
   *  through when it didn't. */
  configured?: boolean;
};

/**
 * One free, no-account-required preview send — lets a visitor see exactly
 * what their invitation looks like on WhatsApp before creating anything.
 * Nothing is persisted to the database; this composes and sends a message
 * directly from the details they've typed so far.
 *
 * Rate-limited by the *phone number itself* (not just IP) — "واحد مسموح
 * لهم على رقم واحد" — so the same guest number can't be preview-spammed
 * regardless of how many different visitors/sessions try it.
 */
export async function sendPreviewInvitationAction(
  _prevState: PreviewSendState,
  formData: FormData,
): Promise<PreviewSendState> {
  const eventName = String(formData.get('eventName') ?? '').trim();
  const guestName = String(formData.get('guestName') ?? '').trim();
  const phoneRaw = String(formData.get('phone') ?? '').trim();
  const locale = formData.get('locale') === 'en' ? 'en' : 'ar';

  if (!eventName || eventName.length > 150 || !guestName || guestName.length > 100) {
    return { error: 'invalidInput' };
  }

  const parsedPhone = normalizePhone(phoneRaw);
  if (!parsedPhone.ok) return { error: 'invalidPhone' };

  const supabase = await createClient();
  const allowed = await checkRateLimit(supabase, {
    action: 'preview-send',
    scope: parsedPhone.e164,
    maxHits: 1,
    windowSeconds: 60 * 60 * 24,
  });
  if (!allowed) return { error: 'rateLimited' };

  if (!isWhatsAppConfigured()) {
    // Demo/unconfigured environment: the trial mechanic itself (rate
    // limiting, form validation) still works end to end, but nothing is
    // actually delivered — say so instead of pretending it sent.
    return { sent: true, configured: false };
  }

  const text =
    locale === 'ar'
      ? `مرحبًا ${guestName}! هذه معاينة تجريبية لدعوة "${eventName}" عبر InviteFlow.`
      : `Hi ${guestName}! This is a free preview of your "${eventName}" invitation, via InviteFlow.`;

  try {
    await whatsAppProvider.send({ to: parsedPhone.e164, text });
    return { sent: true, configured: true };
  } catch (error) {
    console.error('[preview-send] failed', error);
    return { error: 'sendFailed' };
  }
}
