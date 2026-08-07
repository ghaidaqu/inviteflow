import type { EmailProvider, EmailMessage } from './provider';

/**
 * Default provider when no email service is connected. Logs instead of
 * sending, so the app works fully (RSVP, tickets, dashboard) without an
 * email account — the only cost is that notification emails don't go out.
 */
export const consoleEmailProvider: EmailProvider = {
  async send(message: EmailMessage) {
    console.log('[email:console] RESEND_API_KEY not set — email not sent', {
      to: message.to,
      subject: message.subject,
    });
  },
};
