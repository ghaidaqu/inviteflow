import { normalizePhone } from '@/lib/utils/phone';
import { parseGuestListText } from '@/lib/utils/guest-list';

/**
 * Turns whatever the organizer threw at us — a pasted list, a picked set of
 * phone contacts, a .vcf export — into one reviewed, de-duplicated shape
 * before anything is written.
 *
 * Nothing here saves. The whole point is that the organizer sees exactly what
 * would be created (and what's wrong with it) and confirms first, rather than
 * discovering afterwards that they imported the same cousin three times under
 * three spellings of his number.
 */

export type ImportIssue = 'invalidPhone' | 'missingPhone' | 'duplicateInList' | 'alreadyAdded';

export type ReviewedGuest = {
  /** Stable key for React lists and per-row edits. */
  id: string;
  name: string;
  /** Exactly what the source gave us, kept so the organizer can recognise it. */
  rawPhone: string;
  /** E.164, or null when the number couldn't be understood. */
  e164: string | null;
  expectedCompanions: number;
  issues: ImportIssue[];
  /** Rows start selected unless they'd be a no-op or a duplicate. */
  selected: boolean;
};

export type ReviewSummary = {
  total: number;
  importable: number;
  invalidPhone: number;
  missingPhone: number;
  duplicateInList: number;
  alreadyAdded: number;
};

export type RawImportRow = { name: string; phone: string; expectedCompanions?: number };

let counter = 0;
const nextId = () => `imp-${++counter}`;

/**
 * @param rows      Freshly parsed rows, in the order the organizer supplied.
 * @param existing  Phones already saved on this event, in any format.
 */
export function reviewGuestRows(rows: RawImportRow[], existing: string[] = []): ReviewedGuest[] {
  const existingE164 = new Set(
    existing
      .map((p) => normalizePhone(p))
      .filter((r): r is { ok: true; e164: string } => r.ok)
      .map((r) => r.e164),
  );

  const seen = new Set<string>();

  return rows.map((row) => {
    const name = row.name.trim();
    const rawPhone = row.phone.trim();
    const issues: ImportIssue[] = [];

    const parsed = normalizePhone(rawPhone);
    const e164 = parsed.ok ? parsed.e164 : null;

    if (!parsed.ok) {
      issues.push(parsed.reason === 'empty' ? 'missingPhone' : 'invalidPhone');
    } else {
      if (existingE164.has(parsed.e164)) issues.push('alreadyAdded');
      if (seen.has(parsed.e164)) issues.push('duplicateInList');
      seen.add(parsed.e164);
    }

    // A guest with no usable number is still worth adding (the organizer may
    // fill it in later or invite them another way) — only genuine duplicates
    // are deselected by default, so confirming never silently double-adds.
    const isDuplicate = issues.includes('alreadyAdded') || issues.includes('duplicateInList');
    const isInvalid = issues.includes('invalidPhone');

    return {
      id: nextId(),
      name,
      rawPhone,
      e164,
      expectedCompanions: Math.max(0, Math.min(50, Math.floor(row.expectedCompanions ?? 0))),
      issues,
      selected: !isDuplicate && !isInvalid && name.length > 0,
    };
  });
}

/** Parses a small, conventional contacts CSV (name, phone, companions).
 * Header names are accepted in Arabic or English; headerless files use the
 * same column order. Quoted commas and escaped quotes are supported.
 */
export function parseGuestCsv(text: string): RawImportRow[] {
  const parseLine = (line: string): string[] => {
    const cells: string[] = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (quoted && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = !quoted;
      } else if (char === ',' && !quoted) {
        cells.push(cell.trim());
        cell = '';
      } else cell += char;
    }
    cells.push(cell.trim());
    return cells;
  };

  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim());
  if (lines.length === 0) return [];

  const first = parseLine(lines[0]);
  const normalized = first.map((v) => v.toLowerCase().replace(/[\s_-]/g, ''));
  const nameHeaders = ['name', 'fullname', 'الاسم', 'اسمالضيف'];
  const phoneHeaders = ['phone', 'mobile', 'tel', 'الجوال', 'رقمالجوال'];
  const companionHeaders = ['companions', 'expectedcompanions', 'مرافقون', 'المرافقون'];
  const nameIndex = normalized.findIndex((v) => nameHeaders.includes(v));
  const phoneIndex = normalized.findIndex((v) => phoneHeaders.includes(v));
  const hasHeader = nameIndex >= 0 || phoneIndex >= 0;
  const companionsIndex = normalized.findIndex((v) => companionHeaders.includes(v));

  return lines.slice(hasHeader ? 1 : 0).map((line) => {
    const cells = parseLine(line);
    const companionRaw = cells[companionsIndex >= 0 ? companionsIndex : 2] ?? '';
    const parsedCompanions = Number(companionRaw);
    return {
      name: cells[nameIndex >= 0 ? nameIndex : 0] ?? '',
      phone: cells[phoneIndex >= 0 ? phoneIndex : 1] ?? '',
      expectedCompanions: Number.isFinite(parsedCompanions) ? parsedCompanions : 0,
    };
  });
}

export function summarize(rows: ReviewedGuest[]): ReviewSummary {
  const count = (issue: ImportIssue) => rows.filter((r) => r.issues.includes(issue)).length;
  return {
    total: rows.length,
    importable: rows.filter((r) => r.selected).length,
    invalidPhone: count('invalidPhone'),
    missingPhone: count('missingPhone'),
    duplicateInList: count('duplicateInList'),
    alreadyAdded: count('alreadyAdded'),
  };
}

export function reviewPastedText(text: string, existing: string[] = []): ReviewedGuest[] {
  return reviewGuestRows(parseGuestListText(text), existing);
}

/**
 * Minimal vCard reader — enough for the exports Contacts apps actually
 * produce (iOS, Android, Google Contacts), not a full RFC 6350 parser.
 * Handles 2.1/3.0/4.0 line folding, quoted-printable-free TEL/FN/N fields,
 * and multiple TEL lines per card (each becomes its own reviewable row).
 */
export function parseVCard(text: string): RawImportRow[] {
  // Unfold: a leading space or tab means "continuation of the previous line".
  const unfolded = text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
  const cards = unfolded.split(/BEGIN:VCARD/i).slice(1);

  const out: RawImportRow[] = [];
  for (const card of cards) {
    const lines = card.split('\n');
    let fn = '';
    let structured = '';
    const tels: string[] = [];

    for (const line of lines) {
      const colon = line.indexOf(':');
      if (colon === -1) continue;
      const key = line.slice(0, colon).toUpperCase();
      const value = line.slice(colon + 1).trim();
      if (!value) continue;

      if (key === 'FN' || key.startsWith('FN;')) fn = value;
      else if (key === 'N' || key.startsWith('N;')) structured = value;
      else if (key === 'TEL' || key.startsWith('TEL;')) tels.push(value.replace(/^tel:/i, ''));
    }

    // N is "Family;Given;Middle;Prefix;Suffix" — render it "Given Family".
    const fromStructured = structured
      ? (() => {
          const [family = '', given = ''] = structured.split(';');
          return [given, family].filter(Boolean).join(' ').trim();
        })()
      : '';

    const name = (fn || fromStructured).trim();
    if (!name && tels.length === 0) continue;

    if (tels.length === 0) out.push({ name, phone: '' });
    else for (const tel of tels) out.push({ name, phone: tel });
  }
  return out;
}
