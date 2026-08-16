import { describe, expect, it } from 'vitest';
import { normalizePhone, toWhatsAppNumber, formatPhoneForDisplay } from '@/lib/utils/phone';

const e164 = (raw: string | null | undefined) => {
  const r = normalizePhone(raw);
  return r.ok ? r.e164 : `INVALID:${r.reason}`;
};

describe('normalizePhone', () => {
  it('accepts the three local Saudi spellings', () => {
    expect(e164('0551234567')).toBe('+966551234567');
    expect(e164('551234567')).toBe('+966551234567');
    expect(e164('+966551234567')).toBe('+966551234567');
  });

  it('accepts 00 and bare country-code prefixes', () => {
    expect(e164('00966551234567')).toBe('+966551234567');
    expect(e164('966551234567')).toBe('+966551234567');
  });

  it('tolerates a country code followed by a local 0', () => {
    expect(e164('9660551234567')).toBe('+966551234567');
  });

  it('strips spaces, dashes, dots and parentheses', () => {
    expect(e164('+966 55 123 4567')).toBe('+966551234567');
    expect(e164('(055) 123-4567')).toBe('+966551234567');
    expect(e164('055.123.4567')).toBe('+966551234567');
  });

  it('converts Arabic-Indic digits', () => {
    expect(e164('٠٥٥١٢٣٤٥٦٧')).toBe('+966551234567');
    expect(e164('۰۵۵۱۲۳۴۵۶۷')).toBe('+966551234567');
  });

  it('normalizes every spelling of one number to the same value', () => {
    const forms = ['0551234567', '551234567', '+966551234567', '00966551234567', '٠٥٥١٢٣٤٥٦٧'];
    expect(new Set(forms.map(e164)).size).toBe(1);
  });

  it('rejects numbers that are too short or too long', () => {
    expect(e164('05512345')).toBe('INVALID:invalid');
    expect(e164('05512345678')).toBe('INVALID:invalid');
  });

  it('rejects a Saudi number that does not start with 5', () => {
    expect(e164('0111234567')).toBe('INVALID:invalid');
    expect(e164('+966111234567')).toBe('INVALID:invalid');
  });

  it('rejects letters and empty input', () => {
    expect(e164('not a phone')).toBe('INVALID:invalid');
    expect(e164('')).toBe('INVALID:empty');
    expect(e164('   ')).toBe('INVALID:empty');
    expect(e164(null)).toBe('INVALID:empty');
  });

  it('accepts other countries only when written internationally', () => {
    expect(e164('+14155552671')).toBe('+14155552671');
    expect(e164('0044207183875')).toBe('+44207183875');
    // Same digits without an international prefix are a mistyped local
    // number, not a foreign one.
    expect(e164('14155552671')).toBe('INVALID:invalid');
  });
});

describe('toWhatsAppNumber', () => {
  it('returns E.164 without the leading +', () => {
    expect(toWhatsAppNumber('0551234567')).toBe('966551234567');
    expect(toWhatsAppNumber('+966551234567')).toBe('966551234567');
  });
});

describe('formatPhoneForDisplay', () => {
  it('shows Saudi numbers in local form', () => {
    expect(formatPhoneForDisplay('+966551234567')).toBe('0551234567');
  });

  it('leaves other countries in E.164', () => {
    expect(formatPhoneForDisplay('+14155552671')).toBe('+14155552671');
  });

  it('passes through anything it cannot parse', () => {
    expect(formatPhoneForDisplay('weird')).toBe('weird');
  });
});
