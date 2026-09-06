import { NextResponse, type NextRequest } from 'next/server';
import { Webhook } from 'standardwebhooks';
import { sendWhatsAppOtp } from '@/lib/whatsapp/send-otp';

/**
 * Supabase's "Send SMS Hook" — configured under Authentication → Hooks in
 * the dashboard, this replaces Supabase's own (Twilio-only) SMS sending
 * entirely. Supabase POSTs here with the phone number + OTP any time a
 * user requests a phone sign-in code; we're responsible for actually
 * delivering it however we like. This is what lets phone login work
 * through the same Meta WhatsApp Cloud API already used for invitations,
 * with zero dependency on Twilio (which doesn't support verifying Saudi
 * numbers on a trial account — see this project's own history for why
 * that path was abandoned).
 *
 * Payload is signed the same way Supabase signs its other webhooks (the
 * "Standard Webhooks" spec) — verify it with the secret from the
 * dashboard's hook setup screen (SEND_SMS_HOOK_SECRET below), or anyone
 * who finds this URL could trigger arbitrary WhatsApp sends through it.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.SEND_SMS_HOOK_SECRET;
  if (!secret) {
    console.error('[send-sms-hook] SEND_SMS_HOOK_SECRET is not configured');
    return NextResponse.json({ error: { message: 'Hook not configured' } }, { status: 500 });
  }

  const payload = await request.text();
  const headers = Object.fromEntries(request.headers);

  let event: { user: { phone: string }; sms: { otp: string } };
  try {
    const wh = new Webhook(secret.replace('v1,whsec_', ''));
    event = wh.verify(payload, headers) as typeof event;
  } catch (error) {
    console.error('[send-sms-hook] signature verification failed', error);
    return NextResponse.json({ error: { message: 'Invalid signature' } }, { status: 401 });
  }

  try {
    await sendWhatsAppOtp(event.user.phone, event.sms.otp);
  } catch (error) {
    console.error('[send-sms-hook] WhatsApp send failed', error);
    return NextResponse.json(
      { error: { http_code: 500, message: 'Failed to send WhatsApp OTP' } },
      { status: 500 },
    );
  }

  return NextResponse.json({});
}
