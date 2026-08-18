'use client';

import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
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
import type { QuickStartDraft } from '@/lib/actions/quick-start';
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';

const DRAFT_KEY = 'inviteflow_draft_event';

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

/**
 * The full, real event-creation form — the same core fields as the
 * authenticated dashboard's EventForm (see event-form.tsx: same
 * name/type/description/dates/location/map/cover/locale/visibility,
 * plus custom questions for the Link track) — just reachable with no
 * login wall. Password protection is intentionally left out of this
 * quick flow; it's still available from the dashboard afterward.
 * Nothing is persisted until the organizer authenticates (see /finish):
 * this is local React state the whole way through, handed off to auth
 * via sessionStorage.
 */
export function QuickStartForm({ track }: { track: 'invitation' | 'rsvp' }) {
  const t = useTranslations('QuickStart');
  const tForm = useTranslations('Events.form');
  const tTypes = useTranslations('Events.types');
  const tSettings = useTranslations('EventSettings');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const ArrowIcon = isRtl ? ArrowLeftIcon : ArrowRightIcon;

  const { register, control, handleSubmit, watch, setValue } = useForm<FormValues>({
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
  // One switch, not two — allowAttending/allowNotAttending always move
  // together here (see the combined switch below), so watching either
  // is enough to know whether responding is enabled at all.
  const allowAttending = useWatch({ control, name: 'allowAttending' });
  const noStatusEnabled = !allowAttending;

  const [questions, setQuestions] = useState<QuestionInput[]>([]);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [nameError, setNameError] = useState(false);

  const finishHref = `/register?next=${encodeURIComponent(`/${locale}/start/${track}/finish`)}`;

  function saveDraftAndProceed(e: React.MouseEvent) {
    const values = watch();
    if (!values.name.trim()) {
      e.preventDefault();
      setNameError(true);
      return;
    }
    if (noStatusEnabled) {
      e.preventDefault();
      return;
    }
    const draft: QuickStartDraft = {
      track,
      ...values,
      questions,
      // Only the invitation track sends a per-guest trial invite — see
      // QuickStartDraft's doc comment.
      guestName: track === 'invitation' ? guestName : '',
      guestPhone: track === 'invitation' ? guestPhone : '',
    };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }

  return (
    <form onSubmit={handleSubmit(() => {})} noValidate className="flex flex-col gap-6">
      <FieldGroup>
        <Field data-invalid={nameError}>
          <FieldLabel htmlFor="qs-name">{tForm('nameLabel')}</FieldLabel>
          <Input
            id="qs-name"
            {...register('name', { onChange: () => setNameError(false) })}
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
                      {(value: string | null) => tForm(value === 'ar' ? 'localeAr' : 'localeEn')}
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
                        {tForm(visibility === 'public' ? 'visibilityPublic' : 'visibilityPrivate')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </div>

        {track === 'rsvp' && <InlineQuestionsBuilder value={questions} onChange={setQuestions} />}

        {/* The link track has no accept/decline step at all — a guest opens
            the link, registers that they're coming, and answers the
            questions above; there's no separate "decline" action to toggle.
            Only the invitation track (one send per guest, a real
            accept/decline reply) needs these two switches. */}
        {track === 'invitation' && (
          <>
            {noStatusEnabled && (
              <p className="text-destructive text-sm">{t('atLeastOneStatusError')}</p>
            )}

            {/* One switch — accepting and declining aren't two separate
                settings a guest can be given independently; it's a single
                "can this guest respond at all" choice. Keeps
                allowAttending/allowNotAttending in sync so the rest of the
                pipeline (draft → createEventFromQuickStartAction →
                event_settings) doesn't need to change. */}
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
          </>
        )}

        <Field orientation="horizontal">
          <FieldLabel htmlFor="qs-qr-enabled" className="flex-1 font-normal">
            {tForm('isQrEnabledLabel')}
          </FieldLabel>
          <Controller
            control={control}
            name="isQrEnabled"
            render={({ field }) => (
              <Switch id="qs-qr-enabled" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </Field>
      </FieldGroup>

      <div className="border-t pt-6">
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
              <Field>
                <FieldLabel htmlFor="qs-guest-name">{t('guestNameLabel')}</FieldLabel>
                <Input
                  id="qs-guest-name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="qs-guest-phone">{t('guestPhoneLabel')}</FieldLabel>
                <Input
                  id="qs-guest-phone"
                  type="tel"
                  dir="ltr"
                  placeholder="+9665XXXXXXXX"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                />
              </Field>
            </div>
          </FieldGroup>
        )}

        <Button
          size="lg"
          className="mt-6 w-full"
          nativeButton={false}
          onClick={saveDraftAndProceed}
          render={<Link href={finishHref} />}
        >
          {t('finishButton')}
          <ArrowIcon className="size-4 rtl:rotate-180" />
        </Button>
      </div>
    </form>
  );
}
