export type WhatsAppButton = {
  /**
   * Echoed back verbatim in the webhook when the guest taps it — encode
   * whatever the reply handler needs to identify what was tapped, e.g.
   * `rsvp_accept:<guestId>`. Max ~256 chars per WhatsApp's limits.
   */
  id: string;
  /** Visible button label. WhatsApp allows at most 20 characters. */
  title: string;
};

export type WhatsAppMessage = {
  /** E.164 phone number, e.g. "9665XXXXXXXX" (no leading +). */
  to: string;
  text: string;
  /**
   * Up to 3 tappable reply buttons (Meta Cloud API "interactive" message).
   * When present, the guest can respond without ever leaving WhatsApp —
   * see app/api/webhooks/whatsapp/route.ts for where the tap comes back.
   */
  buttons?: WhatsAppButton[];
  /**
   * Sends an image message instead of text — `text` becomes the image's
   * caption. Must be a public HTTPS URL Meta's servers can fetch (not a
   * data: URI); see lib/services/qr.service.ts for the one caller that
   * uses this, sending a guest their entry QR. Mutually exclusive with
   * `buttons` — Meta's API doesn't support both on one message.
   */
  imageUrl?: string;
  /**
   * Unlike `imageUrl`, this is a header image shown ABOVE the text on an
   * interactive button message — combinable with `buttons`. Used for the
   * invitation send itself (the event's cover image, if it has one),
   * matching how every competitor's WhatsApp invite actually looks: a
   * real invitation card, not a plain-text message. Ignored if `buttons`
   * isn't also set (there's no non-interactive "image + text" message
   * shape this maps to — use `imageUrl` for that instead).
   */
  headerImageUrl?: string;
};

/**
 * Swappable WhatsApp transport — same shape as `EmailProvider`/
 * `PaymentProvider`. Callers never depend on a concrete provider.
 */
export interface WhatsAppProvider {
  send(message: WhatsAppMessage): Promise<void>;
}
