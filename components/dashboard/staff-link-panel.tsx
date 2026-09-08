'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { CopyLinkButton } from '@/components/dashboard/copy-link-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { regenerateCheckInTokenAction } from '@/lib/actions/check-in';
import { RefreshCwIcon } from 'lucide-react';

/**
 * The shareable door-staff link, plus the one control that matters for
 * it: replacing the secret. There's only ever one valid token per event,
 * so issuing a new link is the same act as revoking the old one — which
 * is why this is a single button and not a separate "revoke" next to it.
 *
 * Holds the link in state rather than re-reading the page, so the new URL
 * is on screen (and copyable) the instant it's issued.
 */
export function StaffLinkPanel({
  eventId,
  initialLink,
  linkBase,
}: {
  eventId: string;
  initialLink: string;
  /** Everything before the token, so a regenerated token can be turned
   *  back into a full URL here without the server round-tripping one. */
  linkBase: string;
}) {
  const t = useTranslations('CheckIn');
  const [link, setLink] = useState(initialLink);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(false);
  const [regenerated, setRegenerated] = useState(false);

  function regenerate() {
    setError(false);
    setRegenerated(false);
    startTransition(async () => {
      const result = await regenerateCheckInTokenAction(eventId);
      if (result.token) {
        setLink(`${linkBase}${result.token}`);
        setRegenerated(true);
      } else {
        setError(true);
      }
    });
  }

  return (
    <div className="bg-card mt-6 rounded-xl border p-4">
      <p className="text-sm font-medium">{t('staffLinkLabel')}</p>
      <p className="text-muted-foreground mt-1 text-sm">{t('staffLinkHint')}</p>

      <p className="text-muted-foreground mt-3 text-xs break-all" dir="ltr">
        {link}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <CopyLinkButton link={link} />
        <Button variant="outline" size="sm" disabled={isPending} onClick={regenerate}>
          <RefreshCwIcon />
          {isPending ? t('regenerating') : t('regenerate')}
        </Button>
      </div>

      {regenerated && (
        <Alert className="mt-3">
          <AlertDescription>{t('regenerated')}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription>{t('errors.unknown')}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
