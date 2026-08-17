'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cancelReminderAction } from '@/lib/actions/reminders';
import type { ReminderRow } from '@/lib/services/reminders.service';
import { BellIcon, BellOffIcon } from 'lucide-react';

const STATUS_VARIANT = {
  scheduled: 'secondary',
  sent: 'default',
  canceled: 'outline',
} as const;

export function RemindersPanel({
  eventId,
  reminders,
  locale,
}: {
  eventId: string;
  reminders: ReminderRow[];
  locale: string;
}) {
  const t = useTranslations('Events.detail.reminders');
  const [isPending, startTransition] = useTransition();

  if (reminders.length === 0) return null;

  return (
    <div className="bg-card mt-6 rounded-2xl border p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <BellIcon className="size-4" /> {t('title')}
      </h2>
      <p className="text-muted-foreground mt-1 text-xs">{t('hint')}</p>
      <ul className="mt-4 flex flex-col gap-2">
        {reminders.map((reminder) => (
          <li
            key={reminder.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm"
          >
            <div>
              <div className="font-medium">{t(`kind.${reminder.kind}`)}</div>
              <div className="text-muted-foreground text-xs">
                {new Date(reminder.scheduled_at).toLocaleString(locale)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={STATUS_VARIANT[reminder.status]}>
                {t(`status.${reminder.status}`)}
              </Badge>
              {reminder.status === 'scheduled' && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => startTransition(() => cancelReminderAction(eventId, reminder.id))}
                  aria-label={t('cancel')}
                >
                  <BellOffIcon className="size-3.5" /> {t('cancel')}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
