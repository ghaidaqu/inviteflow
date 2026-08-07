import type { WhatsAppProvider, WhatsAppMessage } from './provider';

export const consoleWhatsAppProvider: WhatsAppProvider = {
  async send(message: WhatsAppMessage) {
    console.log('[whatsapp:console] WhatsApp Cloud API not configured — message not sent', {
      to: message.to,
      buttons: message.buttons?.map((b) => b.title),
    });
  },
};
