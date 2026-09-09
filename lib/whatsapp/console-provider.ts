import type { WhatsAppProvider, WhatsAppMessage, WhatsAppSendResult } from './provider';

export const consoleWhatsAppProvider: WhatsAppProvider = {
  async send(message: WhatsAppMessage): Promise<WhatsAppSendResult> {
    console.log('[whatsapp:console] WhatsApp Cloud API not configured — message not sent', {
      to: message.to,
      buttons: message.buttons?.map((b) => b.title),
      imageUrl: message.imageUrl,
      headerImageUrl: message.headerImageUrl,
    });
    // No id: nothing was actually sent, so there is no delivery to track.
    return {};
  },
};
