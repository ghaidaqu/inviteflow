'use client';

import { useActionState, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel, FieldGroup } from '@/components/ui/field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { eventTypes } from '@/lib/validations/events';
import { sendPreviewInvitationAction, type PreviewSendState } from '@/lib/actions/preview';
import { ArrowLeftIcon, ArrowRightIcon, SendIcon } from 'lucide-react';

export type EventDraft = {
  track: 'invitation' | 'rsvp';
  name: string;
  type: string;
  eventDate: string;
  locationText: string;
  guestName: string;
  guestPhone: string;
};

const DRAFT_KEY = 'inviteflow_draft_event';

const previewInitialState: PreviewSendState = {};

/**
 * The "instant start" flow — fill in your event, try one free WhatsApp
 * preview send to your own number, then log in only at the very end to
 * actually activate it. Nothing is written to the database until the
 * organizer is authenticated (see the /finish page): this component's
 * whole first phase is just local React state, and the draft is handed
 * off to auth via sessionStorage + `next`, not a half-created DB row.
 */
export function QuickStartForm({ track }: { track: 'invitation' | 'rsvp' }) {
  const t = useTranslations('QuickStart');
  const tTypes = useTranslations('Events.types');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const ArrowIcon = isRtl ? ArrowLeftIcon : ArrowRightIcon;

  const [step, setStep] = useState<'details' | 'try'>('details');
  const [name, setName] = useState('');
  const [type, setType] = useState('other');
  const [eventDate, setEventDate] = useState('');
  const [locationText, setLocationText] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [detailsError, setDetailsError] = useState(false);

  const [previewState, previewAction, isPreviewPending] = useActionState(
    sendPreviewInvitationAction,
    previewInitialState,
  );

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setDetailsError(true);
      return;
    }
    setDetailsError(false);
    setStep('try');
  }

  function saveDraftAndProceed() {
    const draft: EventDraft = { track, name, type, eventDate, locationText, guestName, guestPhone };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }

  const finishHref = `/register?next=${encodeURIComponent(`/${locale}/start/${track}/finish`)}`;

  if (step === 'details') {
    return (
      <form onSubmit={handleContinue} className="flex flex-col gap-6">
        <FieldGroup>
          <Field data-invalid={detailsError}>
            <FieldLabel htmlFor="qs-name">{t('nameLabel')}</FieldLabel>
            <Input
              id="qs-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('namePlaceholder')}
              autoFocus
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="qs-type">{t('typeLabel')}</FieldLabel>
            <Select value={type} onValueChange={(value) => value && setType(value)}>
              <SelectTrigger id="qs-type" className="w-full">
                <SelectValue>{() => tTypes(type)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {eventTypes.map((eventType) => (
                  <SelectItem key={eventType} value={eventType}>
                    {tTypes(eventType)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="qs-date">{t('eventDateLabel')}</FieldLabel>
              <Input
                id="qs-date"
                type="datetime-local"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="qs-location">{t('locationTextLabel')}</FieldLabel>
              <Input
                id="qs-location"
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
              />
            </Field>
          </div>

          <Button type="submit" size="lg" className="w-full">
            {t('continueButton')}
            <ArrowIcon className="size-4 rtl:rotate-180" />
          </Button>
        </FieldGroup>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold tracking-tight">{t('tryTitle')}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{t('tryDescription')}</p>
      </div>

      <form action={previewAction} className="flex flex-col gap-4">
        <input type="hidden" name="eventName" value={name} />
        <input type="hidden" name="locale" value={locale} />
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="qs-guest-name">{t('guestNameLabel')}</FieldLabel>
            <Input
              id="qs-guest-name"
              name="guestName"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="qs-guest-phone">{t('guestPhoneLabel')}</FieldLabel>
            <Input
              id="qs-guest-phone"
              name="phone"
              type="tel"
              dir="ltr"
              placeholder="+9665XXXXXXXX"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              required
            />
          </Field>

          {previewState.error && (
            <Alert variant="destructive">
              <AlertDescription>{t(`errors.${previewState.error}`)}</AlertDescription>
            </Alert>
          )}
          {previewState.sent && (
            <Alert>
              <AlertDescription>
                {previewState.configured ? t('previewSent') : t('previewSentDemo')}
              </AlertDescription>
            </Alert>
          )}

          <Button type="submit" variant="outline" className="w-full" disabled={isPreviewPending}>
            <SendIcon className="size-4" />
            {isPreviewPending ? t('sending') : t('sendPreviewButton')}
          </Button>
        </FieldGroup>
      </form>

      <div className="border-t pt-4">
        <Button
          size="lg"
          className="w-full"
          nativeButton={false}
          onClick={saveDraftAndProceed}
          render={<Link href={finishHref} />}
        >
          {t('finishButton')}
        </Button>
        <p className="text-muted-foreground mt-2 text-center text-xs">{t('finishHint')}</p>
      </div>
    </div>
  );
}
