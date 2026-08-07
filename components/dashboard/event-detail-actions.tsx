'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { setEventStatusAction, deleteEventAction } from '@/lib/actions/events';
import type { Database } from '@/types/supabase';

type EventStatus = Database['public']['Tables']['events']['Row']['status'];

export function EventDetailActions({ eventId, status }: { eventId: string; status: EventStatus }) {
  const t = useTranslations('Events.detail');
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);

  function changeStatus(next: EventStatus) {
    startTransition(async () => {
      await setEventStatusAction(eventId, next);
    });
  }

  function confirmDelete() {
    startTransition(async () => {
      await deleteEventAction(eventId);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'draft' && (
        <Button size="sm" disabled={isPending} onClick={() => changeStatus('published')}>
          {t('publishButton')}
        </Button>
      )}
      {status === 'published' && (
        <>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => changeStatus('draft')}
          >
            {t('unpublishButton')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => changeStatus('ended')}
          >
            {t('endButton')}
          </Button>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger render={<Button size="sm" variant="destructive" />}>
          {t('deleteButton')}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteConfirmTitle')}</DialogTitle>
            <DialogDescription>{t('deleteConfirmDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              {t('deleteConfirmCancel')}
            </DialogClose>
            <Button variant="destructive" disabled={isPending} onClick={confirmDelete}>
              {t('deleteConfirmAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
