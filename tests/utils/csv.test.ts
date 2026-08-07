import { describe, expect, it } from 'vitest';
import { buildCsv } from '@/lib/utils/csv';

describe('buildCsv', () => {
  it('joins headers and rows with CRLF and commas', () => {
    const csv = buildCsv(['Name', 'Status'], [['Ahmad', 'Attending']]);
    expect(csv).toContain('Name,Status\r\nAhmad,Attending');
  });

  it('quotes fields containing commas, quotes, or newlines', () => {
    const csv = buildCsv(['Name', 'Note'], [['Ahmad', 'Hello, "friend"\nSecond line']]);
    expect(csv).toContain('"Hello, ""friend""\nSecond line"');
  });

  it('leaves plain fields unquoted', () => {
    const csv = buildCsv(['Name'], [['Ahmad']]);
    expect(csv).not.toContain('"Ahmad"');
  });

  it('starts with a UTF-8 BOM so Excel opens Arabic text correctly', () => {
    const csv = buildCsv(['الاسم'], [['أحمد']]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it('stringifies numeric cells', () => {
    const csv = buildCsv(['Count'], [[3]]);
    expect(csv).toContain('Count\r\n3');
  });
});
