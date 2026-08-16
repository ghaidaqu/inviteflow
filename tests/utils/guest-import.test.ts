import { describe, expect, it } from 'vitest';
import {
  reviewGuestRows,
  reviewPastedText,
  summarize,
  parseVCard,
  parseGuestCsv,
} from '@/lib/utils/guest-import';

describe('reviewGuestRows', () => {
  it('normalizes every row to E.164 and marks them importable', () => {
    const rows = reviewGuestRows([
      { name: 'سلطان', phone: '0551234567' },
      { name: 'نورة', phone: '+966 55 987 6543' },
    ]);
    expect(rows.map((r) => r.e164)).toEqual(['+966551234567', '+966559876543']);
    expect(rows.every((r) => r.selected)).toBe(true);
    expect(rows.every((r) => r.issues.length === 0)).toBe(true);
  });

  it('flags a duplicate inside the same list and deselects only the repeat', () => {
    const rows = reviewGuestRows([
      { name: 'سلطان', phone: '0551234567' },
      { name: 'سلطان الحربي', phone: '+966551234567' },
    ]);
    expect(rows[0].issues).toEqual([]);
    expect(rows[0].selected).toBe(true);
    expect(rows[1].issues).toContain('duplicateInList');
    expect(rows[1].selected).toBe(false);
  });

  it('flags numbers already saved on the event, in any stored format', () => {
    const rows = reviewGuestRows([{ name: 'سلطان', phone: '٠٥٥١٢٣٤٥٦٧' }], ['+966551234567']);
    expect(rows[0].issues).toContain('alreadyAdded');
    expect(rows[0].selected).toBe(false);
  });

  it('separates an unreadable number from a missing one', () => {
    const rows = reviewGuestRows([
      { name: 'أ', phone: '0111234567' },
      { name: 'ب', phone: '' },
    ]);
    expect(rows[0].issues).toContain('invalidPhone');
    expect(rows[0].selected).toBe(false);
    expect(rows[1].issues).toContain('missingPhone');
  });

  it('keeps a guest with no number selected — they can still be invited later', () => {
    const rows = reviewGuestRows([{ name: 'جدّي', phone: '' }]);
    expect(rows[0].selected).toBe(true);
  });

  it('never selects a nameless row', () => {
    const rows = reviewGuestRows([{ name: '', phone: '0551234567' }]);
    expect(rows[0].selected).toBe(false);
  });

  it('gives every row a unique id', () => {
    const rows = reviewGuestRows([
      { name: 'a', phone: '0551111111' },
      { name: 'b', phone: '0552222222' },
    ]);
    expect(new Set(rows.map((r) => r.id)).size).toBe(2);
  });
});

describe('parseGuestCsv', () => {
  it('reads Arabic headers and companions', () => {
    expect(parseGuestCsv('الاسم,رقم الجوال,مرافقون\nسارة,0551234567,2')).toEqual([
      { name: 'سارة', phone: '0551234567', expectedCompanions: 2 },
    ]);
  });

  it('supports quoted commas and headerless files', () => {
    expect(parseGuestCsv('"Alotaibi, Nora",0551234567,1')).toEqual([
      { name: 'Alotaibi, Nora', phone: '0551234567', expectedCompanions: 1 },
    ]);
  });
});

describe('summarize', () => {
  it('counts each category', () => {
    const rows = reviewGuestRows(
      [
        { name: 'ok', phone: '0551234567' },
        { name: 'dup', phone: '0551234567' },
        { name: 'bad', phone: '0111234567' },
        { name: 'none', phone: '' },
        { name: 'existing', phone: '0559876543' },
      ],
      ['0559876543'],
    );
    expect(summarize(rows)).toEqual({
      total: 5,
      importable: 2, // ok + none (duplicates and invalid numbers deselected)
      invalidPhone: 1,
      missingPhone: 1,
      duplicateInList: 1,
      alreadyAdded: 1,
    });
  });
});

describe('reviewPastedText', () => {
  it('parses a pasted block and reviews it in one step', () => {
    const rows = reviewPastedText('سلطان الحربي 0551234567\nنورة العتيبي\t٠٥٥٩٨٧٦٥٤٣');
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe('سلطان الحربي');
    expect(rows[1].e164).toBe('+966559876543');
  });
});

describe('parseVCard', () => {
  it('reads FN and TEL from a simple card', () => {
    const vcf = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'FN:سلطان الحربي',
      'TEL;TYPE=CELL:+966551234567',
      'END:VCARD',
    ].join('\r\n');
    expect(parseVCard(vcf)).toEqual([{ name: 'سلطان الحربي', phone: '+966551234567' }]);
  });

  it('falls back to the structured N field when FN is absent', () => {
    const vcf = 'BEGIN:VCARD\nN:الحربي;سلطان;;;\nTEL:0551234567\nEND:VCARD';
    expect(parseVCard(vcf)).toEqual([{ name: 'سلطان الحربي', phone: '0551234567' }]);
  });

  it('emits one row per TEL when a contact has several', () => {
    const vcf = 'BEGIN:VCARD\nFN:نورة\nTEL:0551111111\nTEL:0552222222\nEND:VCARD';
    expect(parseVCard(vcf)).toEqual([
      { name: 'نورة', phone: '0551111111' },
      { name: 'نورة', phone: '0552222222' },
    ]);
  });

  it('accepts vCard 4 tel: URI values', () => {
    expect(parseVCard('BEGIN:VCARD\nFN:نورة\nTEL:tel:+966551234567\nEND:VCARD')).toEqual([
      { name: 'نورة', phone: '+966551234567' },
    ]);
  });

  it('handles multiple cards and folded lines', () => {
    const vcf = [
      'BEGIN:VCARD',
      // A folded line: the continuation must begin with a space or tab.
      'FN:اسم طوي',
      ' ل',
      'TEL:0551111111',
      'END:VCARD',
      'BEGIN:VCARD',
      'FN:نورة',
      'TEL:0552222222',
      'END:VCARD',
    ].join('\r\n');
    const rows = parseVCard(vcf);
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe('اسم طويل');
  });

  it('keeps a contact that has a name but no number', () => {
    expect(parseVCard('BEGIN:VCARD\nFN:بدون رقم\nEND:VCARD')).toEqual([
      { name: 'بدون رقم', phone: '' },
    ]);
  });

  it('returns nothing for empty or non-vCard input', () => {
    expect(parseVCard('')).toEqual([]);
    expect(parseVCard('just some text')).toEqual([]);
  });
});
