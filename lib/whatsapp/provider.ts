export type WhatsAppMessage = {
  /** E.164 phone number, e.g. "9665XXXXXXXX" (no leading +). */
  to: string;
  text: string;
};

/**
 * Swappable WhatsApp transport — same shape as `EmailProvider`/
 * `PaymentProvider`. Callers never depend on a concrete provider.
 */
export interface WhatsAppProvider {
  send(message: WhatsAppMessage): Promise<void>;
}
