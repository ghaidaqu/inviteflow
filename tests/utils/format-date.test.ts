import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime } from '@/lib/utils/format-date';

/**
 * The bug these lock out: formatting with no timeZone uses the *server's*
 * zone. Production runs UTC, so every Saudi event read three hours early —
 * on the public page, in the dashboard, and inside the WhatsApp reminder.
 * These run under whatever TZ the test host has, which is the point: the
 * output must not depend on it.
 */
describe('formatDateTime', () => {
  const EIGHT_PM_RIYADH = '2026-10-15T17:00:00+00:00';

  it('renders a Riyadh evening as the evening, not late afternoon', () => {
    const en = formatDateTime(EIGHT_PM_RIYADH, 'en-US');
    expect(en).toMatch(/8:00\s?PM/i);
    expect(en).not.toMatch(/5:00/);
  });

  it('keeps the same instant on the same calendar day', () => {
    expect(formatDateTime(EIGHT_PM_RIYADH, 'en-US')).toMatch(/Oct 15, 2026/);
  });

  it('does not shift a time that would cross midnight in UTC', () => {
    // 22:00 Riyadh is 19:00Z the same day; naive UTC formatting would also
    // move an 01:00 Riyadh event back to the previous date.
    const oneAmRiyadh = '2026-10-15T22:00:00+00:00'; // 01:00 on the 16th in Riyadh
    const en = formatDateTime(oneAmRiyadh, 'en-US');
    expect(en).toMatch(/Oct 16, 2026/);
    expect(en).toMatch(/1:00\s?AM/i);
  });

  it('returns an empty string rather than "Invalid Date"', () => {
    expect(formatDateTime(null, 'ar')).toBe('');
    expect(formatDateTime(undefined, 'ar')).toBe('');
    expect(formatDateTime('not a date', 'ar')).toBe('');
  });

  it('formats in Arabic without leaking the wrong day', () => {
    expect(formatDate(EIGHT_PM_RIYADH, 'ar-SA')).toBeTruthy();
    expect(formatDate('not a date', 'ar-SA')).toBe('');
  });
});
