import 'server-only';
import { consoleWhatsAppProvider } from './console-provider';
import { createWhatsAppCloudApiProvider } from './cloud-api-provider';
import type { WhatsAppProvider } from './provider';
import { toWhatsAppNumber } from '@/lib/utils/phone';

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

const baseProvider: WhatsAppProvider = isWhatsAppConfigured()
  ? createWhatsAppCloudApiProvider(
      process.env.WHATSAPP_ACCESS_TOKEN!,
      process.env.WHATSAPP_PHONE_NUMBER_ID!,
    )
  : consoleWhatsAppProvider;

/**
 * Meta's API only accepts E.164 without a "+", but guests' numbers are stored
 * however they were entered — historically "05XXXXXXXX", which the API would
 * reject outright. Normalizing here rather than at each call site means every
 * path (RSVP confirmations, invitations, ticket delivery, webhook replies) is
 * covered, including guests saved before numbers were normalized on input.
 */
export const whatsAppProvider: WhatsAppProvider = {
  async send(message) {
    return baseProvider.send({ ...message, to: toWhatsAppNumber(message.to) });
  },
};

export * from './provider';
