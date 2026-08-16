import { normalizeDigits } from '@/lib/utils/digits';

/**
 * Phone numbers arrive here in every shape a person might type or a contacts
 * app might export: "0551234567", "+966 55 123 4567", "٠٥٥١٢٣٤٥٦٧",
 * "00966551234567", "(055) 123-4567". Storing them verbatim means the same
 * guest can be added twice under two spellings, and — because the WhatsApp
 * provider expects E.164 — a locally-formatted number silently fails to send.
 *
 * Everything is normalized to E.164 with a leading "+" (the unambiguous
 * standard form). `toWhatsAppNumber` strips the "+" at the transport edge,
 * which is the only place that wants it gone.
 */

const SAUDI_DIAL = '966';

export type PhoneResult = { ok: true; e164: string } | { ok: false; reason: 'empty' | 'invalid' };

/** Digits only, with Arabic-Indic converted and formatting characters dropped. */
function cleanup(raw: string): string {
  return normalizeDigits(raw).replace(/[\s()\-.‎‏]/g, '');
}

export function normalizePhone(raw: string | null | undefined): PhoneResult {
  const input = cleanup(String(raw ?? ''));
  if (!input) return { ok: false, reason: 'empty' };

  let digits = input;
  let explicitIntl = false;

  if (digits.startsWith('+')) {
    digits = digits.slice(1);
    explicitIntl = true;
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2);
    explicitIntl = true;
  }

  if (!/^\d+$/.test(digits)) return { ok: false, reason: 'invalid' };

  // Saudi mobiles are 5XXXXXXXX (9 digits). Accept the three ways people
  // write them locally before falling back to generic international rules.
  if (!explicitIntl) {
    if (/^05\d{8}$/.test(digits)) return { ok: true, e164: `+${SAUDI_DIAL}${digits.slice(1)}` };
    if (/^5\d{8}$/.test(digits)) return { ok: true, e164: `+${SAUDI_DIAL}${digits}` };
  }

  if (digits.startsWith(SAUDI_DIAL)) {
    const rest = digits.slice(SAUDI_DIAL.length);
    // Tolerate "966 05..." — a real thing people paste from contact apps.
    const mobile = rest.startsWith('0') ? rest.slice(1) : rest;
    return /^5\d{8}$/.test(mobile)
      ? { ok: true, e164: `+${SAUDI_DIAL}${mobile}` }
      : { ok: false, reason: 'invalid' };
  }

  // Any other country: only accepted when the number was written
  // internationally, so a mistyped local number isn't silently treated as a
  // foreign one. E.164 allows up to 15 digits.
  if (explicitIntl && /^\d{8,15}$/.test(digits)) return { ok: true, e164: `+${digits}` };

  return { ok: false, reason: 'invalid' };
}

/** Meta's Cloud API wants E.164 *without* the leading "+". */
export function toWhatsAppNumber(phone: string): string {
  const result = normalizePhone(phone);
  return result.ok ? result.e164.slice(1) : cleanup(phone).replace(/^\+/, '');
}

/** Local, readable form for Saudi numbers; E.164 for everything else. */
export function formatPhoneForDisplay(phone: string): string {
  const result = normalizePhone(phone);
  if (!result.ok) return phone;
  const saudi = result.e164.match(/^\+966(5\d{8})$/);
  return saudi ? `0${saudi[1]}` : result.e164;
}
