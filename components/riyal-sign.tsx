/**
 * The Saudi Riyal sign, drawn rather than typed.
 *
 * The character (U+20C1) is new enough that most phones and browsers have
 * no glyph for it — on those it renders as an empty box, which is worse
 * than writing "ر.س". As a path it looks the same everywhere, scales with
 * the surrounding type (1em), and takes the text colour.
 *
 * The outline is the symbol's own geometry: straight strokes, traced off a
 * rendering of the character and simplified back to its corner points.
 */
export function RiyalSign({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className ?? 'inline-block size-[0.72em] align-baseline'}
      fill="currentColor"
      role="img"
      aria-label="ريال سعودي"
    >
      <path d="M10.88 0L11.03 0L11.03 10.22L14.24 9.64L14.24 1.17L16.72 0.73L16.72 9.15L22.32 8.18L22.32 10.86L16.77 11.88L16.67 14.99L22.32 13.97L22.32 16.65L14.24 18.21L14.24 12.46L11.12 12.95L10.98 18.6L10.73 19.42L10.05 20.25L8.79 20.79L1.68 22.1L1.68 19.42L8.54 18.11L8.54 13.53L2.95 14.51L2.95 11.83L8.54 10.76L8.54 0.49L10.88 0Z M22.32 19.76L22.27 22.49L14.24 24L14.24 21.32L22.32 19.76Z" />
    </svg>
  );
}
