import { normalizeDigits } from '@/lib/utils/digits';

// An organizer with a hundred-plus guests isn't going to type each one
// into a separate name/phone pair by hand — they already have the list
// somewhere (Excel, Notes, a WhatsApp forward) and just want to paste it.
// This accepts pretty much any "name ... number" shape per line — tab-
// separated (Excel/Sheets copy-paste), comma-separated, or just plain
// space-separated — by finding the phone-looking run of digits on the
// line and treating everything else on that line as the name, rather
// than requiring a specific delimiter. Separators are stripped in both
// alphabets: an Arabic list is far more likely to use "،" than ",".
const PHONE_PATTERN = /(\+?\d[\d\s-]{6,}\d)/;

export type ParsedGuestRow = { name: string; phone: string };

export function parseGuestListText(text: string): ParsedGuestRow[] {
  return text
    .split(/\r?\n/)
    .map((line) => normalizeDigits(line).trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(PHONE_PATTERN);
      if (!match || match.index === undefined) {
        return {
          name: line.replace(/^[\s,;\u060C\u061B\t|-]+|[\s,;\u060C\u061B\t|-]+$/g, ''),
          phone: '',
        };
      }
      const phone = match[0].replace(/[\s-]/g, '');
      const name = (line.slice(0, match.index) + line.slice(match.index + match[0].length)).replace(
        /^[\s,;\u060C\u061B\t|-]+|[\s,;\u060C\u061B\t|-]+$/g,
        '',
      );
      return { name, phone };
    })
    .filter((row) => row.name || row.phone);
}
