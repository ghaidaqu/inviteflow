import type { CSSProperties } from 'react';
import Image from 'next/image';

/** The approved Mhalli symbol in its upright flower orientation. Its
 * source petals have a fine outline so they remain full and legible at
 * the small sizes used in navigation and invitation credits. */
export function BrandMark({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <Image
      src="/brand/mhalli-official-symbol-upright.svg"
      width={100}
      height={100}
      unoptimized
      alt=""
      aria-hidden="true"
      className={className}
      style={style}
    />
  );
}
