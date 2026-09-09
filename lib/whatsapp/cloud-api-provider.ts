import type { WhatsAppProvider, WhatsAppMessage, WhatsAppSendResult } from './provider';

const GRAPH_API_VERSION = 'v20.0';

function normalizeNumber(raw: string): string {
  // Meta expects digits only (no "+", spaces, dashes, parentheses).
  return raw.replace(/[^\d]/g, '');
}

/**
 * Sends free-form text messages via Meta's WhatsApp Cloud API.
 *
 * ⚠️ Outside an active 24-hour customer-service window (i.e. the guest
 * hasn't messaged your WhatsApp Business number recently), Meta requires a
 * pre-approved message *template* instead of free text — a plain text send
 * will be rejected. Approve a template in Meta Business Manager and swap
 * the request body below to `type: 'template'` if you hit that. This
 * implementation hasn't been exercised against a live WhatsApp Business
 * account (this environment doesn't have one) — verify the exact response
 * shape once connected.
 */
export function createWhatsAppCloudApiProvider(
  accessToken: string,
  phoneNumberId: string,
): WhatsAppProvider {
  return {
    async send({
      to,
      text,
      buttons,
      imageUrl,
      headerImageUrl,
      template,
    }: WhatsAppMessage): Promise<WhatsAppSendResult> {
      // A template is the only shape Meta accepts outside the 24-hour
      // customer-service window, so it wins over every free-form option.
      const templateBody = template && {
        messaging_product: 'whatsapp',
        to: normalizeNumber(to),
        type: 'template',
        template: {
          name: template.name,
          language: { code: template.language },
          components: [
            ...(template.headerImageUrl
              ? [
                  {
                    type: 'header',
                    parameters: [{ type: 'image', image: { link: template.headerImageUrl } }],
                  },
                ]
              : []),
            ...(template.bodyParams.length
              ? [
                  {
                    type: 'body',
                    parameters: template.bodyParams.map((t: string) => ({ type: 'text', text: t })),
                  },
                ]
              : []),
            // One component per quick-reply button, indexed in the order
            // they were defined on the approved template. The payload is
            // what comes back in the webhook when the guest taps.
            ...(template.buttonPayloads ?? []).map((payload: string, index: number) => ({
              type: 'button',
              sub_type: 'quick_reply',
              index: String(index),
              parameters: [{ type: 'payload', payload }],
            })),
          ],
        },
      };

      const body = templateBody
        ? templateBody
        : imageUrl
          ? {
              messaging_product: 'whatsapp',
              to: normalizeNumber(to),
              type: 'image',
              image: { link: imageUrl, caption: text },
            }
          : buttons && buttons.length > 0
            ? {
                messaging_product: 'whatsapp',
                to: normalizeNumber(to),
                type: 'interactive',
                interactive: {
                  type: 'button',
                  ...(headerImageUrl
                    ? { header: { type: 'image', image: { link: headerImageUrl } } }
                    : {}),
                  body: { text },
                  action: {
                    buttons: buttons.slice(0, 3).map((b) => ({
                      type: 'reply',
                      reply: { id: b.id, title: b.title },
                    })),
                  },
                },
              }
            : {
                messaging_product: 'whatsapp',
                to: normalizeNumber(to),
                type: 'text',
                text: { body: text },
              };

      const res = await fetch(
        `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) {
        const responseBody = await res.text().catch(() => '');
        throw new Error(`WhatsApp Cloud API send failed (${res.status}): ${responseBody}`);
      }

      // { messages: [{ id: "wamid.HBg..." }] }. Read defensively — a 200
      // with an unexpected body should still count as a successful send,
      // it just means we can't track this one's delivery.
      const payload = (await res.json().catch(() => null)) as {
        messages?: { id?: string }[];
      } | null;
      return { messageId: payload?.messages?.[0]?.id };
    },
  };
}
