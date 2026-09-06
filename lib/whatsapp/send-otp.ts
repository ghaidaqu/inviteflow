import 'server-only';
import { toWhatsAppNumber } from '@/lib/utils/phone';

const GRAPH_API_VERSION = 'v21.0';

/**
 * Sends a login OTP over WhatsApp using Meta's "Authentication" template
 * category — a completely different message shape from the free-text
 * `whatsAppProvider.send()` used everywhere else in this codebase (see
 * lib/whatsapp/index.ts). That distinction matters: Meta only allows
 * free-form text within an active 24-hour customer-service window (the
 * guest messaged us recently); a login code goes to someone who's never
 * messaged the business number, so it has no such window and MUST go out
 * as a pre-approved template instead, or Meta rejects it outright.
 *
 * The template itself (name below) has to exist and be APPROVED in Meta
 * Business Manager first — which itself requires the WhatsApp Business
 * Account to have passed Meta's own Business Verification (real business
 * documents, reviewed by Meta, 1-2 business days). Until that's done,
 * template creation fails with "This WhatsApp business account does not
 * have permission to create message template" (confirmed live against
 * this project's WABA) — this function will then fail the same way any
 * other API call against an unapproved template does. Nothing to fix
 * here in that case; it starts working the moment the template is
 * approved, with no code change needed.
 */
const OTP_TEMPLATE_NAME = 'login_otp_ar';
const OTP_TEMPLATE_LANGUAGE = 'ar';

export async function sendWhatsAppOtp(to: string, code: string): Promise<void> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!accessToken || !phoneNumberId) {
    throw new Error(
      'WhatsApp is not configured (missing WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID)',
    );
  }

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toWhatsAppNumber(to),
        type: 'template',
        template: {
          name: OTP_TEMPLATE_NAME,
          language: { code: OTP_TEMPLATE_LANGUAGE },
          components: [
            // Authentication templates take the code twice: once to fill
            // the (Meta-authored, non-editable) body text, once more for
            // the "Copy code" button — see the template definition itself
            // in lib/whatsapp/send-otp.ts's sibling setup script.
            { type: 'body', parameters: [{ type: 'text', text: code }] },
            {
              type: 'button',
              sub_type: 'copy_code',
              index: '0',
              parameters: [{ type: 'coupon_code', coupon_code: code }],
            },
          ],
        },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`WhatsApp OTP template send failed (${res.status}): ${body}`);
  }
}
