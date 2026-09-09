/**
 * Every date this product shows is a Saudi event time.
 *
 * `new Date(x).toLocaleString(locale)` with no timeZone formats in the
 * *server's* zone, and the server runs in UTC — so an event stored at
 * 2026-10-15T17:00Z, which is 8:00 PM in Riyadh, was rendered to guests as
 * "5:00:00 م". Three hours early, on every event page, every dashboard
 * screen, and inside the WhatsApp reminder itself. The invitation card the
 * organizer uploaded said one time and the page under it said another.
 *
 * Pinning the zone here rather than at each call site means a new screen
 * cannot reintroduce it by forgetting an option object.
 */
const TIME_ZONE = 'Asia/Riyadh';

type Locale = string;

function toDate(value: string | Date): Date | null {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date and time, e.g. "١٥‏/١٠‏/٢٠٢٦، ٨:٠٠ م". */
export function formatDateTime(value: string | Date | null | undefined, locale: Locale): string {
  const d = value ? toDate(value) : null;
  if (!d) return '';
  return d.toLocaleString(locale, {
    timeZone: TIME_ZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/** Date only, e.g. "١٥ أكتوبر ٢٠٢٦". */
export function formatDate(value: string | Date | null | undefined, locale: Locale): string {
  const d = value ? toDate(value) : null;
  if (!d) return '';
  return d.toLocaleDateString(locale, { timeZone: TIME_ZONE, dateStyle: 'medium' });
}
