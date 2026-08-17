'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createEventFromQuickStartAction, type QuickStartDraft } from '@/lib/actions/quick-start';
import { Loader2Icon } from 'lucide-react';

const DRAFT_KEY = 'inviteflow_draft_event';

/**
 * Lands here straight after login/registration (see the `next` param
 * QuickStartForm sends auth through). Reads the full draft saved to
 * sessionStorage before the auth redirect and hands it to
 * createEventFromQuickStartAction — the only place in this whole flow
 * that writes to the database and, if a test contact was given, sends the
 * real invitation (Accept/Decline buttons, QR, everything a real guest
 * gets).
 *
 * That action redirects to the new event's dashboard page on success by
 * throwing Next's internal redirect signal, which propagates fine from a
 * client component calling a server action — there's no explicit
 * "success" branch below because control never returns here.
 */
export function FinishCreating({ track }: { track: 'invitation' | 'rsvp' }) {
  const t = useTranslations('QuickStart.finish');
  const locale = useLocale();
  const [state, setState] = useState<'creating' | 'noDraft' | 'unauthorized' | 'error'>('creating');

  useEffect(() => {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) {
      setState('noDraft');
      return;
    }

    let draft: QuickStartDraft;
    try {
      draft = JSON.parse(raw);
    } catch {
      setState('noDraft');
      return;
    }

    // Clear immediately — this draft is single-use whether creation
    // succeeds or fails, so a retry always starts from the form again
    // rather than silently resubmitting stale data.
    sessionStorage.removeItem(DRAFT_KEY);

    createEventFromQuickStartAction(draft).then((result) => {
      if (result?.error === 'unauthorized') {
        setState('unauthorized');
      } else if (result?.error) {
        setState('error');
      }
      // No success branch: the action redirects internally.
    });
  }, [track, locale]);

  if (state === 'creating') {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <Loader2Icon className="text-primary size-8 animate-spin" />
        <p className="text-muted-foreground">{t('creating')}</p>
      </main>
    );
  }

  if (state === 'unauthorized') {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-muted-foreground">{t('unauthorized')}</p>
        <Button
          nativeButton={false}
          render={
            <Link href={`/login?next=${encodeURIComponent(`/${locale}/start/${track}/finish`)}`} />
          }
        >
          {t('loginButton')}
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <Alert variant="destructive">
        <AlertDescription>{state === 'noDraft' ? t('noDraft') : t('error')}</AlertDescription>
      </Alert>
      <Button nativeButton={false} render={<Link href={`/start/${track}`} />}>
        {t('backToStart')}
      </Button>
    </main>
  );
}
