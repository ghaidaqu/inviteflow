export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
};

/**
 * Swappable email transport — mirrors the `PaymentProvider` pattern in
 * `lib/payments/`. Callers should never depend on a concrete provider, only
 * on this interface, so plugging in a different transport later never
 * touches call sites.
 */
export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}
