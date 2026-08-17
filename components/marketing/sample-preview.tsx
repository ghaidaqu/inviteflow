'use client';

import { useActionState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { sendPreviewInvitationAction, type PreviewSendState } from '@/lib/actions/preview';
import { SendIcon } from 'lucide-react';

const initialState: PreviewSendState = {};

/**
 * Zero-friction sample trial, right on the homepage — no event details, no
 * account, just a phone number. This is the direct replacement for the
 * removed "/guest" demo link: instead of a canned pre-seeded event, a
 * visitor gets a real WhatsApp message (or the honest demo-mode notice)
 * within seconds of landing on the page.
 *
 * Reuses sendPreviewInvitationAction with fixed sample copy — the fuller
 * /start/[track] flow (name/type/date + a preview tied to their actual
 * event) is the next step once someone's genuinely ready to build.
 */
export function SamplePreview() {
  const t = useTranslations('QuickStart.sample');
  const tErrors = useTranslations('QuickStart.errors');
  const locale = useLocale();
  const [state, action, isPending] = useActionState(sendPreviewInvitationAction, initialState);

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="eventName" value={t('sampleEventName')} />
      <input type="hidden" name="guestName" value={t('sampleGuestName')} />
      <input type="hidden" name="locale" value={locale} />
      <p className="text-muted-foreground text-sm font-medium">{t('label')}</p>
      <div className="flex flex-wrap gap-2">
        <Input
          name="phone"
          type="tel"
          dir="ltr"
          placeholder="+9665XXXXXXXX"
          required
          className="max-w-[220px]"
        />
        <Button type="submit" variant="outline" disabled={isPending}>
          <SendIcon className="size-4" />
          {isPending ? t('sending') : t('cta')}
        </Button>
      </div>
      {state.error && <p className="text-destructive text-xs">{tErrors(state.error)}</p>}
      {state.sent && (
        <p className="text-muted-foreground text-xs">
          {state.configured ? t('sentReal') : t('sentDemo')}
        </p>
      )}
    </form>
  );
}
