import 'server-only';
import { consoleWhatsAppProvider } from './console-provider';
import { createWhatsAppCloudApiProvider } from './cloud-api-provider';
import type { WhatsAppProvider } from './provider';

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

export const whatsAppProvider: WhatsAppProvider = isWhatsAppConfigured()
  ? createWhatsAppCloudApiProvider(
      process.env.WHATSAPP_ACCESS_TOKEN!,
      process.env.WHATSAPP_PHONE_NUMBER_ID!,
    )
  : consoleWhatsAppProvider;

export * from './provider';
