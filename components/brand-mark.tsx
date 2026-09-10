import type { CSSProperties } from 'react';
import Image from 'next/image';

/** The approved Mhalli symbol, turned to its upright flower orientation.
 * At its source angle the four petals read as a multiplication sign in
 * small placements; the 45° rotation makes the mark read vertically. */
export function BrandMark({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <Image
      src="/brand/mhalli-official-symbol.svg"
      width={100}
      height={100}
      unoptimized
      alt=""
      aria-hidden="true"
      className={className}
      style={{ ...style, transform: `${style?.transform ?? ''} rotate(45deg)`.trim() }}
    />
  );
}
