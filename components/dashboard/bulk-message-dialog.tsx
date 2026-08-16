'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldLabel } from '@/components/ui/field';
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
import { sendBulkMessageAction, type BulkMessageActionState } from '@/lib/actions/messages';
import { SendIcon } from 'lucide-react';

const initialState: BulkMessageActionState = {};

export function BulkMessageDialog({ eventId }: { eventId: string }) {
  const t = useTranslations('Questions.bulkMessage');
  const [state, formAction, isPending] = useActionState(
    sendBulkMessageAction.bind(null, eventId),
    initialState,
  );

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        <SendIcon /> {t('trigger')}
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t('title')}</DialogTitle>
            <DialogDescription>{t('description')}</DialogDescription>
          </DialogHeader>

          <Field>
            <FieldLabel htmlFor="bulk-message">{t('messageLabel')}</FieldLabel>
            <Textarea
              id="bulk-message"
              name="message"
              rows={4}
              maxLength={1000}
              placeholder={t('messagePlaceholder')}
              required
            />
          </Field>

          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{t(`errors.${state.error}`)}</AlertDescription>
            </Alert>
          )}
          {state.totalRecipients !== undefined && !state.error && (
            <Alert>
              <AlertDescription>
                {state.totalRecipients === 0
                  ? t('noRecipients')
                  : t('sentSummary', {
                      sent: state.sentCount ?? 0,
                      total: state.totalRecipients,
                    })}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              {t('cancel')}
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? t('sending') : t('confirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
