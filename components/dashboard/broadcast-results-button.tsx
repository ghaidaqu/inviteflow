'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { broadcastResultsAction } from '@/lib/actions/results';
import { MegaphoneIcon } from 'lucide-react';

export function BroadcastResultsButton({ eventId }: { eventId: string }) {
  const t = useTranslations('Questions.broadcast');
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ sentCount: number; totalGuests: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSend() {
    setError(null);
    startTransition(async () => {
      const res = await broadcastResultsAction(eventId);
      if (res.error) {
        setError(res.error);
      } else {
        setResult({ sentCount: res.sentCount ?? 0, totalGuests: res.totalGuests ?? 0 });
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setResult(null);
          setError(null);
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>
        <MegaphoneIcon /> {t('trigger')}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{t(`errors.${error}`)}</AlertDescription>
          </Alert>
        )}
        {result && (
          <Alert>
            <AlertDescription>
              {t('sentSummary', { sent: result.sentCount, total: result.totalGuests })}
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{t('cancel')}</DialogClose>
          <Button onClick={handleSend} disabled={isPending}>
            {isPending ? t('sending') : t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
