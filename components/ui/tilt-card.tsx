'use client';

import { useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Real 3D pointer-tracking tilt — perspective + rotateX/rotateY driven
 * directly off cursor position, applied straight to the element's style
 * (not via React state) so it stays smooth under load, per the
 * apple-design/animate skills' performance guidance.
 *
 * Desktop-only by design: gated behind `hover: hover and pointer: fine`
 * (touch devices fire false hovers and can't usefully "point" at a card),
 * and off entirely under prefers-reduced-motion.
 */
export function TiltCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== 'mouse') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5; // -0.5..0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5;

    const maxTilt = 10; // degrees — subtle, not a gimmick
    const rotateY = px * maxTilt * 2;
    const rotateX = -py * maxTilt * 2;

    el.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
  }

  function handlePointerLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
  }

  return (
    <div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cn(
        'transition-transform duration-300 ease-out will-change-transform [transform-style:preserve-3d] motion-reduce:transition-none',
        className,
      )}
    >
      {children}
    </div>
  );
}
