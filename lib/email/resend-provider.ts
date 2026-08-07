import { Resend } from 'resend';
import type { EmailProvider, EmailMessage } from './provider';

const FROM_ADDRESS = process.env.EMAIL_FROM || 'InviteFlow <onboarding@resend.dev>';

export function createResendProvider(apiKey: string): EmailProvider {
  const resend = new Resend(apiKey);

  return {
    async send({ to, subject, html }: EmailMessage) {
      const { error } = await resend.emails.send({ from: FROM_ADDRESS, to, subject, html });
      if (error) throw new Error(error.message);
    },
  };
}
