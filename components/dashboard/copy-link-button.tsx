'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { copyToClipboard } from '@/lib/utils/clipboard';

export function CopyLinkButton({ link }: { link: string }) {
  const t = useTranslations('Events.detail');
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleCopy() {
    const ok = await copyToClipboard(link);
    if (ok) {
      setFailed(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      // The link is already shown as plain text right next to this
      // button (see event-detail-actions.tsx's caller) — copyFailed just
      // points at it instead of duplicating it here.
      setFailed(true);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button size="sm" variant="outline" onClick={handleCopy}>
        {copied ? t('linkCopied') : t('copyLink')}
      </Button>
      {failed && <p className="text-destructive text-xs">{t('copyFailed')}</p>}
    </div>
  );
}
