'use client';

import { useState, useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Field, FieldLabel, FieldGroup } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CoverImageUpload } from '@/components/dashboard/cover-image-upload';
import { LocationMapPicker } from '@/components/dashboard/location-map-picker';
import { InlineQuestionsBuilder } from '@/components/dashboard/inline-questions-builder';
import { eventTypes, eventLocales, eventVisibilities } from '@/lib/validations/events';
import type { QuestionInput } from '@/lib/validations/questions';
import { createEventFromQuickStartAction } from '@/lib/actions/quick-start';
import { ArrowLeftIcon, ArrowRightIcon, Loader2Icon } from 'lucide-react';

type FormValues = {
  name: string;
  type: string;
  description: string;
  eventDate: string;
  rsvpDeadline: string;
  locationText: string;
  locationMapUrl: string;
  coverImageUrl: string;
  primaryLocale: string;
  visibility: string;
  isQrEnabled: boolean;
  allowAttending: boolean;
  allowNotAttending: boolean;
};

const STEP_IDS = ['basics', 'datetime', 'design', 'settings', 'trial'] as const;
type StepId = (typeof STEP_IDS)[number];

/**
 * The full, real event-creation form — the same core fields as the
 * authenticated dashboard's EventForm — reached only after the organizer
 * has already logged in (see the page-level auth guard in
 * app/[locale]/start/[track]/page.tsx). Presented as steps with
 * Next/Back instead of one long scroll: a single page with every field
 * visible at once read like a test to fill out, not something you'd
 * enjoy doing. Each step keeps the same react-hook-form instance —
 * there's no per-step form boundary, just conditional rendering of one
 * step's fields at a time, so nothing is lost moving back and forth.
 */
export function QuickStartWizard({ track }: { track: 'invitation' | 'rsvp' }) {
  const t = useTranslations('QuickStart');
  const tForm = useTranslations('Events.form');
  const tTypes = useTranslations('Events.types');
  const tSettings = useTranslations('EventSettings');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const ArrowIcon = isRtl ? ArrowLeftIcon : ArrowRightIcon;
  const BackArrowIcon = isRtl ? ArrowRightIcon : ArrowLeftIcon;

  const { register, control, handleSubmit, watch, setValue, trigger } = useForm<FormValues>({
    defaultValues: {
      name: '',
      type: 'other',
      description: '',
      eventDate: '',
      rsvpDeadline: '',
      locationText: '',
      locationMapUrl: '',
      coverImageUrl: '',
      primaryLocale: locale === 'en' ? 'en' : 'ar',
      visibility: 'private',
      isQrEnabled: false,
      allowAttending: true,
      allowNotAttending: true,
    },
  });

  const [questions, setQuestions] = useState<QuestionInput[]>([]);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestError, setGuestError] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const steps: readonly StepId[] = STEP_IDS;
  const stepId = steps[stepIndex]!;

  async function goNext() {
    if (stepId === 'basics') {
      const valid = await trigger('name');
      if (!valid) return;
    }
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  function submit(sendTrial: boolean) {
    if (sendTrial && track === 'invitation' && (!guestName.trim() || !guestPhone.trim())) {
      setGuestError(true);
      return;
    }
    setGuestError(false);
    setSubmitError(null);

    const values = watch();
    startTransition(async () => {
      const result = await createEventFromQuickStartAction(
        {
          track,
          ...values,
          questions,
          guestName: track === 'invitation' ? guestName : '',
          guestPhone: track === 'invitation' ? guestPhone : '',
        },
        { sendTrial },
      );
      // No success branch: the action redirects internally when it works.
      if (result?.error) setSubmitError(t('finish.error'));
    });
  }

  if (isPending) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
        <Loader2Icon className="text-primary size-8 animate-spin" />
        <p className="text-muted-foreground">
          {t(track === 'invitation' ? 'finish.creating' : 'finish.creatingLink')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Progress — a thin bar + "step N of M" rather than numbered dots,
          since the step count differs slightly by track and a bar reads
          fine either way without needing per-step labels to fit. */}
      <div className="flex flex-col gap-2">
        <div className="bg-muted h-1.5 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-[width] duration-300 ease-out"
            style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
        <div className="text-muted-foreground flex items-center justify-between text-xs font-medium">
          <span>{t('stepLabel', { current: stepIndex + 1, total: steps.length })}</span>
          <span>{t(`steps.${stepId}`)}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(() => {})} noValidate className="flex flex-col gap-6">
        {stepId === 'basics' && (
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="qs-name">{tForm('nameLabel')}</FieldLabel>
              <Input
                id="qs-name"
                {...register('name', { required: true })}
                placeholder={t('namePlaceholder')}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="qs-type">{tForm('typeLabel')}</FieldLabel>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="qs-type" className="w-full">
                      <SelectValue>
                        {(value: string | null) => (value ? tTypes(value) : '')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {eventTypes.map((eventType) => (
                        <SelectItem key={eventType} value={eventType}>
                          {tTypes(eventType)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="qs-description">{tForm('descriptionLabel')}</FieldLabel>
              <Textarea id="qs-description" rows={4} {...register('description')} />
            </Field>
          </FieldGroup>
        )}

        {stepId === 'datetime' && (
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="qs-date">{tForm('eventDateLabel')}</FieldLabel>
                <Input id="qs-date" type="datetime-local" {...register('eventDate')} />
              </Field>
              <Field>
                <FieldLabel htmlFor="qs-rsvp-deadline">{tForm('rsvpDeadlineLabel')}</FieldLabel>
                <Input id="qs-rsvp-deadline" type="datetime-local" {...register('rsvpDeadline')} />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="qs-location">{tForm('locationTextLabel')}</FieldLabel>
              <Input id="qs-location" {...register('locationText')} />
            </Field>

            <Field>
              <FieldLabel htmlFor="qs-location-map">{tForm('locationMapUrlLabel')}</FieldLabel>
              <Controller
                control={control}
                name="locationMapUrl"
                render={({ field }) => (
                  <LocationMapPicker value={field.value} onChange={field.onChange} />
                )}
              />
            </Field>
          </FieldGroup>
        )}

        {stepId === 'design' && (
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="qs-cover">{tForm('coverImageUrlLabel')}</FieldLabel>
              <Controller
                control={control}
                name="coverImageUrl"
                render={({ field }) => (
                  <CoverImageUpload value={field.value} onChange={field.onChange} />
                )}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="qs-primary-locale">{tForm('primaryLocaleLabel')}</FieldLabel>
                <Controller
                  control={control}
                  name="primaryLocale"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="qs-primary-locale" className="w-full">
                        <SelectValue>
                          {(value: string | null) =>
                            tForm(value === 'ar' ? 'localeAr' : 'localeEn')
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {eventLocales.map((eventLocale) => (
                          <SelectItem key={eventLocale} value={eventLocale}>
                            {tForm(eventLocale === 'ar' ? 'localeAr' : 'localeEn')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="qs-visibility">{tForm('visibilityLabel')}</FieldLabel>
                <Controller
                  control={control}
                  name="visibility"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="qs-visibility" className="w-full">
                        <SelectValue>
                          {(value: string | null) =>
                            tForm(value === 'public' ? 'visibilityPublic' : 'visibilityPrivate')
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {eventVisibilities.map((visibility) => (
                          <SelectItem key={visibility} value={visibility}>
                            {tForm(
                              visibility === 'public' ? 'visibilityPublic' : 'visibilityPrivate',
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>
          </FieldGroup>
        )}

        {stepId === 'settings' && (
          <FieldGroup>
            {track === 'rsvp' && (
              <InlineQuestionsBuilder value={questions} onChange={setQuestions} />
            )}

            {track === 'invitation' && (
              <Field orientation="horizontal">
                <FieldLabel htmlFor="qs-allow-response" className="flex-1 font-normal">
                  {tSettings('allowResponseLabel')}
                </FieldLabel>
                <Controller
                  control={control}
                  name="allowAttending"
                  render={({ field }) => (
                    <Switch
                      id="qs-allow-response"
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        setValue('allowNotAttending', checked);
                      }}
                    />
                  )}
                />
              </Field>
            )}

            <Field orientation="horizontal">
              <FieldLabel htmlFor="qs-qr-enabled" className="flex-1 font-normal">
                {tForm('isQrEnabledLabel')}
              </FieldLabel>
              <Controller
                control={control}
                name="isQrEnabled"
                render={({ field }) => (
                  <Switch
                    id="qs-qr-enabled"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </Field>
          </FieldGroup>
        )}

        {stepId === 'trial' && (
          <div>
            <span className="text-primary text-sm font-semibold">{t('tryFreeLabel')}</span>
            <h2 className="mt-1 text-lg font-bold tracking-tight">
              {t(track === 'invitation' ? 'trialTitle' : 'trialTitleLink')}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {t(track === 'invitation' ? 'trialDescription' : 'trialDescriptionLink')}
            </p>

            {track === 'invitation' && (
              <FieldGroup className="mt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field data-invalid={guestError}>
                    <FieldLabel htmlFor="qs-guest-name">{t('guestNameLabel')}</FieldLabel>
                    <Input
                      id="qs-guest-name"
                      value={guestName}
                      onChange={(e) => {
                        setGuestName(e.target.value);
                        setGuestError(false);
                      }}
                    />
                  </Field>
                  <Field data-invalid={guestError}>
                    <FieldLabel htmlFor="qs-guest-phone">{t('guestPhoneLabel')}</FieldLabel>
                    <Input
                      id="qs-guest-phone"
                      type="tel"
                      dir="ltr"
                      placeholder="+9665XXXXXXXX"
                      value={guestPhone}
                      onChange={(e) => {
                        setGuestPhone(e.target.value);
                        setGuestError(false);
                      }}
                    />
                  </Field>
                </div>
                {guestError && (
                  <p className="text-destructive text-sm">{t('guestRequiredError')}</p>
                )}
              </FieldGroup>
            )}

            {submitError && <p className="text-destructive mt-4 text-sm">{submitError}</p>}
          </div>
        )}

        {/* Nav row — Back (hidden on step 1) + Next, or on the final step
            the track-specific finishing action(s) instead of Next. The
            invitation track gets two real, distinct actions here (try
            with a real send, or approve without one); the link track has
            no per-guest trial concept at all, so it just gets one. */}
        <div className="flex items-center justify-between gap-3 border-t pt-4">
          {stepIndex > 0 ? (
            <Button type="button" variant="outline" onClick={goBack}>
              <BackArrowIcon className="size-4 rtl:rotate-180" />
              {t('backButton')}
            </Button>
          ) : (
            <span />
          )}

          {stepId !== 'trial' ? (
            <Button type="button" onClick={goNext}>
              {t('nextButton')}
              <ArrowIcon className="size-4 rtl:rotate-180" />
            </Button>
          ) : track === 'invitation' ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={() => submit(false)}>
                {t('approveButton')}
              </Button>
              <Button type="button" variant="secondary" onClick={() => submit(true)}>
                {t('tryButton')}
                <ArrowIcon className="size-4 rtl:rotate-180" />
              </Button>
            </div>
          ) : (
            <Button type="button" variant="secondary" onClick={() => submit(false)}>
              {t('createButton')}
              <ArrowIcon className="size-4 rtl:rotate-180" />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
