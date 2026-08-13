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

// Decorative editorial serif — used only for the huge cropped "INVITE"
// background typography on the homepage, never for real body/UI text.
export const playfair = localFont({
  src: './../public/fonts/playfair-latin.woff2',
  variable: '--font-playfair',
  weight: '700 900',
  display: 'swap',
});

export const fontVariables = [
  cairoArabic.variable,
  cairoLatin.variable,
  geistSans.variable,
  geistMono.variable,
  playfair.variable,
].join(' ');
