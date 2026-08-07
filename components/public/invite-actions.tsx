'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { buildIcsContent } from '@/lib/utils/calendar';

export function InviteActions({
  eventName,
  description,
  locationText,
  locationMapUrl,
  eventDate,
  publicLink,
}: {
  eventName: string;
  description: string | null;
  locationText: string | null;
  locationMapUrl: string | null;
  eventDate: string | null;
  publicLink: string;
}) {
  const t = useTranslations('PublicEvent');
  const [copied, setCopied] = useState(false);

  function handleAddToCalendar() {
    if (!eventDate) return;
    const start = new Date(eventDate);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const ics = buildIcsContent({
      title: eventName,
      description: description ?? undefined,
      location: locationText ?? undefined,
      start,
      end,
      uid: `${publicLink}`,
    });
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${eventName}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleShareWhatsapp() {
    const message = t('shareMessage', { name: eventName }) + ' ' + publicLink;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(publicLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {locationMapUrl && (
        <Button
          variant="outline"
          nativeButton={false}
          render={<a href={locationMapUrl} target="_blank" rel="noreferrer" />}
        >
          {t('openLocationButton')}
        </Button>
      )}
      {eventDate && (
        <Button variant="outline" onClick={handleAddToCalendar}>
          {t('addToCalendarButton')}
        </Button>
      )}
      <Button variant="outline" onClick={handleShareWhatsapp}>
        {t('shareWhatsappButton')}
      </Button>
      <Button variant="outline" onClick={handleCopyLink}>
        {copied ? t('linkCopied') : t('copyLinkButton')}
      </Button>
    </div>
  );
}
