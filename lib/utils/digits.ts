// Arabic keyboards default to Arabic-Indic (٠١٢٣٤٥٦٧٨٩) or Extended
// Arabic-Indic/Farsi (۰۱۲۳۴۵۶۷۸۹) digits, but every phone/OTP validation
// regex in this app only accepts ASCII 0-9 — a guest or organizer typing
// their real phone number in Arabic numerals would get a confusing
// "invalid" error over digits that look completely normal to them.
// Normalizing at the input boundary means every downstream schema only
// ever has to deal with plain ASCII digits.
const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const EXTENDED_ARABIC_INDIC_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export function normalizeDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (char) => {
    const arabicIndex = ARABIC_INDIC_DIGITS.indexOf(char);
    if (arabicIndex !== -1) return String(arabicIndex);
    const extendedIndex = EXTENDED_ARABIC_INDIC_DIGITS.indexOf(char);
    return extendedIndex !== -1 ? String(extendedIndex) : char;
  });
}
