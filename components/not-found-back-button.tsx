'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

/**
 * Goes back in the browser's own history instead of forcing a jump to the
 * homepage — landing on the marketing homepage after hitting a bad link
 * mid-dashboard looked like being signed out (the header switches to the
 * logged-out marketing nav even though the session itself is untouched),
 * and meant re-navigating from scratch instead of just retrying whatever
 * was clicked. The history check happens on click, not at render time —
 * this always renders the same button markup on the server and the
 * client, so there's nothing to hydrate differently. Falls back to "/"
 * only when there's genuinely nowhere to go back to (the bad link was
 * opened directly, with no prior page in this tab).
 */
export function NotFoundBackButton({ label }: { label: string }) {
  const router = useRouter();

  function handleClick() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  }

  return (
    <Button type="button" onClick={handleClick}>
      {label}
    </Button>
  );
}
