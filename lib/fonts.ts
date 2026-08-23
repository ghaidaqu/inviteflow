import localFont from 'next/font/local';

/**
 * Self-hosted instead of `next/font/google`, which reaches out to
 * fonts.googleapis.com at build time — that turns any network-isolated CI or
 * container build into a hard failure. The woff2 files in `public/fonts/` are
 * the exact subsets Google serves, vendored once so builds are hermetic.
 *
 * Cairo ships as two files (Arabic and Latin subsets) because each contains
 * only its own glyphs. Rather than hand-maintaining `unicode-range` — which
 * `next/font/local` can only apply to a whole family, not per file — both are
 * registered as separate families and stacked in `--font-sans`. The browser
 * already resolves per glyph down a font stack, so Arabic text picks up
 * cairo-arabic and Latin text falls through to cairo-latin automatically.
 */

export const cairoArabic = localFont({
  src: './../public/fonts/cairo-arabic.woff2',
  variable: '--font-cairo-arabic',
  weight: '200 1000',
  display: 'swap',
  // The Arabic subset has no Latin glyphs to compare against, so Next's
  // synthetic Arial metric-matching would be measuring the wrong script.
  // No `fallback` either: Next splices those families in immediately after
  // this one, which would land them *before* cairoLatin in --font-sans and
  // send Latin glyphs to a system font instead of Cairo.
  adjustFontFallback: false,
});

export const cairoLatin = localFont({
  src: './../public/fonts/cairo-latin.woff2',
  variable: '--font-cairo-latin',
  weight: '200 1000',
  display: 'swap',
});

export const geistSans = localFont({
  src: './../public/fonts/geist-latin.woff2',
  variable: '--font-geist-sans',
  weight: '100 900',
  display: 'swap',
});

export const geistMono = localFont({
  src: './../public/fonts/geist-mono-latin.woff2',
  variable: '--font-geist-mono',
  weight: '100 900',
  display: 'swap',
});

// Display serif for marketing headlines only (hero, section titles, the
// wordmark) — a classic Arabic book-typesetting face, not a UI font.
// Dashboard/forms/tables keep Cairo for dense-text legibility; this is
// scoped to `.font-display` in globals.css, not the base --font-sans stack.
export const amiri = localFont({
  src: [
    { path: './../public/fonts/amiri-400.woff2', weight: '400', style: 'normal' },
    { path: './../public/fonts/amiri-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-amiri',
  display: 'swap',
});

export const fontVariables = [
  cairoArabic.variable,
  cairoLatin.variable,
  geistSans.variable,
  geistMono.variable,
  amiri.variable,
].join(' ');

// Decorative calligraphic face used for exactly one line — the "بسم الله"
// opener on the wedding-invitation cover templates — never the "one font"
// site chrome. Deliberately NOT added to `fontVariables`/the root layout:
// importing it here only registers the @font-face where it's actually
// used (wedding-invitation-templates.tsx), so it never loads on any other
// page. Arabic-only subset — the one string it renders has no Latin
// glyphs, so there's no Latin file to pair it with (contrast Cairo above).
export const arefRuqaa = localFont({
  src: './../public/fonts/aref-ruqaa-700.woff2',
  weight: '700',
  style: 'normal',
  variable: '--font-aref-ruqaa',
  display: 'swap',
});
