import type { WhatsAppProvider, WhatsAppMessage } from './provider';

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
    async send({ to, text, buttons }: WhatsAppMessage) {
      const body =
        buttons && buttons.length > 0
          ? {
              messaging_product: 'whatsapp',
              to: normalizeNumber(to),
              type: 'interactive',
              interactive: {
                type: 'button',
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
    },
  };
}
