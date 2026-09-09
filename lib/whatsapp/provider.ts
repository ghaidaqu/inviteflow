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

/**
 * A pre-approved message template, the ONLY thing Meta lets you send to
 * someone who hasn't messaged your business number in the last 24 hours.
 *
 * Free-form sends to anyone outside that window are rejected with error
 * 131047 "Re-engagement message" — which is exactly what production was
 * doing: the owner's own number received invitations (their window was
 * open) and every real guest's send failed. An invitation is by
 * definition the first message to someone, so it has to be a template.
 */
export type WhatsAppTemplate = {
  /** Template name exactly as approved in Meta Business Manager. */
  name: string;
  /** BCP-47 code of the approved template, e.g. "ar". */
  language: string;
  /** Values for {{1}}, {{2}}, … in the template body, in order. */
  bodyParams: string[];
  /**
   * Payloads for the template's quick-reply buttons, in the order they
   * were defined. These come back in the webhook as
   * `messages[].button.payload`, so they carry the same
   * `rsvp_accept:<guestId>` strings the interactive buttons use.
   */
  buttonPayloads?: string[];
  /** Public HTTPS image for a template whose header is of type IMAGE. */
  headerImageUrl?: string;
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
  /**
   * Sends an approved template instead of a free-form message. Takes
   * precedence over `text` / `buttons` / `imageUrl` — see
   * WhatsAppTemplate for why the invitation path needs it.
   */
  template?: WhatsAppTemplate;
};

export type WhatsAppSendResult = {
  /**
   * Meta's own message id (a "wamid"). It is the ONLY thing that ties a
   * later delivery-status webhook back to the message it is about — the
   * webhook carries no guest, event, or request of ours — so anything
   * that wants to know whether a message actually arrived has to write
   * this down at send time. See lib/services/whatsapp-delivery.service.ts.
   *
   * Undefined when the transport has no id to give (the console provider
   * used with no credentials configured), never on a real send.
   */
  messageId?: string;
};

/**
 * Swappable WhatsApp transport — same shape as `EmailProvider`/
 * `PaymentProvider`. Callers never depend on a concrete provider.
 */
export interface WhatsAppProvider {
  send(message: WhatsAppMessage): Promise<WhatsAppSendResult>;
}
