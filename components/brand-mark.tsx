import type { CSSProperties } from 'react';
import Image from 'next/image';

/** The approved Mhalli symbol. Keeping this as the source asset rather
 * than redrawing its petals in JSX means every small use stays identical
 * to the official icon used in WhatsApp, invitations and social cards. */
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
      style={style}
    />
  );
}
