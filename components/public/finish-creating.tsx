'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createEventAction } from '@/lib/actions/events';
import type { EventDraft } from '@/components/public/quick-start-form';
import { Loader2Icon } from 'lucide-react';

const DRAFT_KEY = 'inviteflow_draft_event';

function toIso(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

/**
 * Lands here straight after login/registration (see the `next` param
 * QuickStartForm sends auth through). Reads the draft saved to
 * sessionStorage before the auth redirect and actually creates the event
 * now that there's a real authenticated user to own it — this is the
 * only place in the whole instant-start flow that touches the database.
 *
 * `createEventAction` redirects to the new event's dashboard page on
 * success by throwing Next's internal redirect signal, which propagates
 * fine from a client component calling a server action — there's no
 * explicit "success" branch below because control never returns here.
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

    let draft: EventDraft;
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

    const formData = new FormData();
    formData.set('name', draft.name);
    formData.set('type', draft.type);
    formData.set('description', '');
    formData.set('eventDate', toIso(draft.eventDate));
    formData.set('rsvpDeadline', '');
    formData.set('locationText', draft.locationText);
    formData.set('locationMapUrl', '');
    formData.set('coverImageUrl', '');
    formData.set('primaryLocale', locale === 'en' ? 'en' : 'ar');
    formData.set('visibility', 'private');
    formData.set('isRsvpEnabled', 'true');
    formData.set('isQrEnabled', 'false');
    formData.set('isPasswordProtected', 'false');
    formData.set('password', '');
    formData.set('eventEndDate', '');
    formData.set('organizationName', '');
    formData.set('organizationLogoUrl', '');

    createEventAction({}, formData).then((result) => {
      if (result?.error === 'unauthorized') {
        setState('unauthorized');
      } else if (result?.error) {
        setState('error');
      }
      // No success branch: createEventAction redirects internally.
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
