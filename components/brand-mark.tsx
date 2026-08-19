/**
 * The مهلّي mark: a tilted square (diamond) with a center dot — the same
 * small ornament used as a section divider throughout the marketing
 * pages, promoted to a standalone icon here. Two-tone on purpose: the
 * diamond in the primary (rust/terracotta, the "digital invitation"
 * track's color) and the dot in the secondary (teal, the "link
 * invitation" track's color) — so the mark itself quietly carries both
 * halves of the product instead of being an arbitrary shape.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path d="M10 1.5 L18.5 10 L10 18.5 L1.5 10 Z" fill="var(--primary)" />
      <circle cx="10" cy="10" r="2.75" fill="var(--secondary)" />
    </svg>
  );
}
