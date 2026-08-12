import { describe, expect, it } from 'vitest';
import { parseGuestListText } from '@/lib/utils/guest-list';

describe('parseGuestListText', () => {
  it('parses tab-separated lines (Excel/Sheets paste)', () => {
    const rows = parseGuestListText('سلطان الحربي\t0501234567\nنورة العتيبي\t0559876543');
    expect(rows).toEqual([
      { name: 'سلطان الحربي', phone: '0501234567' },
      { name: 'نورة العتيبي', phone: '0559876543' },
    ]);
  });

  it('parses comma-separated lines', () => {
    const rows = parseGuestListText('سلطان, 0501234567');
    expect(rows).toEqual([{ name: 'سلطان', phone: '0501234567' }]);
  });

  it('parses plain space-separated lines', () => {
    const rows = parseGuestListText('سلطان الحربي 0501234567');
    expect(rows).toEqual([{ name: 'سلطان الحربي', phone: '0501234567' }]);
  });

  it('handles a phone with a country code and dashes', () => {
    const rows = parseGuestListText('Ahmad +966-50-123-4567');
    expect(rows).toEqual([{ name: 'Ahmad', phone: '+966501234567' }]);
  });

  it('normalizes Arabic-Indic digits in the phone number', () => {
    const rows = parseGuestListText('سلطان ٠٥٠١٢٣٤٥٦٧');
    expect(rows).toEqual([{ name: 'سلطان', phone: '0501234567' }]);
  });

  it('keeps a name-only line with an empty phone', () => {
    const rows = parseGuestListText('سلطان بدون رقم');
    expect(rows).toEqual([{ name: 'سلطان بدون رقم', phone: '' }]);
  });

  it('skips blank lines', () => {
    const rows = parseGuestListText('سلطان 0501234567\n\n\nنورة 0559876543\n');
    expect(rows).toHaveLength(2);
  });

  it('returns an empty array for empty input', () => {
    expect(parseGuestListText('')).toEqual([]);
    expect(parseGuestListText('   \n  \n')).toEqual([]);
  });
});
