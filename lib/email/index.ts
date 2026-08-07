import 'server-only';
import { consoleEmailProvider } from './console-provider';
import { createResendProvider } from './resend-provider';
import type { EmailProvider } from './provider';

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * The single swap point for the email transport. Everything else in the app
 * imports `emailProvider`/`isEmailConfigured` from here — never a concrete
 * provider — so connecting a real account is a one-env-var change.
 */
export const emailProvider: EmailProvider = isEmailConfigured()
  ? createResendProvider(process.env.RESEND_API_KEY!)
  : consoleEmailProvider;

export * from './provider';
