import { describe, expect, it } from 'vitest';
import { normalizePhone } from '@/lib/utils/phone';

/**
 * The organizer path used to store whatever digits were typed when a
 * number could not be parsed, which both guaranteed a silent WhatsApp
 * failure and slipped past the duplicate guard. These lock in the
 * contract the action now depends on: parseable in, E.164 out; anything
 * else rejected outright.
 */
describe('normalizePhone, as the guest-add path relies on it', () => {
  it('accepts every way a Saudi mobile gets written', () => {
    for (const written of [
      '+966511111111',
      '00966511111111',
      '966511111111',
      '0511111111',
      '511111111',
      '+966 51 111 1111',
      '٠٥١١١١١١١١',
    ]) {
      const r = normalizePhone(written);
      expect(r.ok, `for ${written}`).toBe(true);
      if (r.ok) expect(r.e164, `for ${written}`).toBe('+966511111111');
    }
  });

  it('rejects what it cannot turn into a real number', () => {
    for (const junk of ['', '   ', '123', 'abc', '05', '+', '05111111111111111111']) {
      expect(normalizePhone(junk).ok, `for ${junk}`).toBe(false);
    }
  });

  it('keeps two different people apart', () => {
    const a = normalizePhone('0511111111');
    const b = normalizePhone('0511111112');
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) expect(a.e164).not.toBe(b.e164);
  });
});
