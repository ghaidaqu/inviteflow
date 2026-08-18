'use client';

import { useState, useTransition } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import {
  eventFormSchema,
  eventLocales,
  eventTypes,
  eventVisibilities,
  type EventFormInput,
  type EventFormOutput,
} from '@/lib/validations/events';
import type { EventActionState } from '@/lib/actions/events';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Field, FieldLabel, FieldError, FieldDescription, FieldGroup } from '@/components/ui/field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { InlineQuestionsBuilder } from '@/components/dashboard/inline-questions-builder';
import { LocationMapPicker } from '@/components/dashboard/location-map-picker';
import { CoverImageUpload } from '@/components/dashboard/cover-image-upload';
import { OrgLogoUpload } from '@/components/dashboard/org-logo-upload';
import type { QuestionInput } from '@/lib/validations/questions';
import type { Database } from '@/types/supabase';

type EventRow = Database['public']['Tables']['events']['Row'];

function toDateTimeLocal(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIso(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

type Track = 'invitation' | 'rsvp' | 'institutional';

// Presets for the three creation tracks (see the /dashboard/events/new
// chooser page): the decorated Digital Invitation, the simpler Link — a
// registration-only page (name, phone, headcount, custom questions) with no
// invitation design around it — and Institutional, which is the same as a
// Digital Invitation but starts by asking for a company name/logo. All
// three collect RSVP responses; Ticketing has been removed from the
// product entirely.
const TRACK_DEFAULTS: Record<Track, { isRsvpEnabled: boolean }> = {
  invitation: { isRsvpEnabled: true },
  rsvp: { isRsvpEnabled: true },
  institutional: { isRsvpEnabled: true },
};

export function EventForm({
  event,
  action,
  track,
}: {
  event?: EventRow;
  action: (prevState: EventActionState, formData: FormData) => Promise<EventActionState>;
  track?: Track;
}) {
  const t = useTranslations('Events.form');
  const tTypes = useTranslations('Events.types');
  const tErrors = useTranslations('Events.errors');
  const tValidation = useTranslations('Events.validation');
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionInput[]>([]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<EventFormInput, unknown, EventFormOutput>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: event?.name ?? '',
      type: event?.type ?? 'other',
      description: event?.description ?? '',
      eventDate: toDateTimeLocal(event?.event_date ?? null),
      rsvpDeadline: toDateTimeLocal(event?.rsvp_deadline ?? null),
      locationText: event?.location_text ?? '',
      locationMapUrl: event?.location_map_url ?? '',
      coverImageUrl: event?.cover_image_url ?? '',
      primaryLocale: event?.primary_locale ?? 'ar',
      visibility: event?.visibility ?? 'private',
      isRsvpEnabled: event?.is_rsvp_enabled ?? TRACK_DEFAULTS[track ?? 'invitation'].isRsvpEnabled,
      isQrEnabled: event?.is_qr_enabled ?? false,
      isPasswordProtected: Boolean(event?.password_hash),
      password: '',
      eventEndDate: toDateTimeLocal(event?.event_end_date ?? null),
      organizationName: event?.organization_name ?? '',
      organizationLogoUrl: event?.organization_logo_url ?? '',
    },
  });

  const isPasswordProtected = useWatch({ control, name: 'isPasswordProtected' });
  // Shown for a brand-new institutional event, or when editing any event
  // that already has org branding set (even if it somehow lost the track
  // context) — never hidden out from under existing data.
  const isInstitutional = track === 'institutional' || Boolean(event?.organization_name);

  function fieldMessage(message?: string) {
    if (!message) return undefined;
    return tValidation(message);
  }

  function onSubmit(values: EventFormOutput) {
    setServerError(null);
    const formData = new FormData();
    formData.set('name', values.name);
    formData.set('type', values.type);
    formData.set('description', values.description ?? '');
    formData.set('eventDate', toIso(values.eventDate));
    formData.set('rsvpDeadline', toIso(values.rsvpDeadline));
    formData.set('locationText', values.locationText ?? '');
    formData.set('locationMapUrl', values.locationMapUrl ?? '');
    formData.set('coverImageUrl', values.coverImageUrl ?? '');
    formData.set('primaryLocale', values.primaryLocale);
    formData.set('visibility', values.visibility);
    formData.set('isRsvpEnabled', String(values.isRsvpEnabled));
    formData.set('isQrEnabled', String(values.isQrEnabled));
    formData.set('isPasswordProtected', String(values.isPasswordProtected));
    formData.set('password', values.password ?? '');
    formData.set('eventEndDate', toIso(values.eventEndDate));
    formData.set('organizationName', values.organizationName ?? '');
    formData.set('organizationLogoUrl', values.organizationLogoUrl ?? '');

    if (track === 'rsvp' && !event) {
      // Drop fully-blank draft rows (an empty "add question" click the
      // organizer never filled in) rather than sending them to the server
      // and risking the whole batch getting rejected over one empty draft.
      const filledQuestions = questions.filter((q) => q.textAr.trim().length > 0);
      formData.set('questions', JSON.stringify(filledQuestions));
    }

    startTransition(async () => {
      const result = await action({}, formData);
      if (result?.error) setServerError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      {track && !event && <Badge className="w-fit">{t(`trackBadge.${track}`)}</Badge>}

      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{tErrors(serverError)}</AlertDescription>
        </Alert>
      )}

      <FieldGroup>
        {/* Institutional track: asked first, before anything else — see
            the track's spec ("company name and logo up front"). The logo
            is shown as on-page branding only; it does not become the
            sender's WhatsApp display picture (see the migration comment
            on events.organization_logo_url for why). */}
        {isInstitutional && (
          <>
            <Field data-invalid={!!errors.organizationName}>
              <FieldLabel htmlFor="organizationName">{t('organizationNameLabel')}</FieldLabel>
              <Input id="organizationName" {...register('organizationName')} />
              <FieldError>{fieldMessage(errors.organizationName?.message)}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="organizationLogoUrl">{t('organizationLogoLabel')}</FieldLabel>
              <Controller
                control={control}
                name="organizationLogoUrl"
                render={({ field }) => (
                  <OrgLogoUpload value={field.value ?? ''} onChange={field.onChange} />
                )}
              />
            </Field>
          </>
        )}

        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="name">{t('nameLabel')}</FieldLabel>
          <Input id="name" {...register('name')} />
          <FieldError>{fieldMessage(errors.name?.message)}</FieldError>
        </Field>

        <Field data-invalid={!!errors.type}>
          <FieldLabel htmlFor="type">{t('typeLabel')}</FieldLabel>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="type" className="w-full">
                  <SelectValue placeholder={t('typePlaceholder')}>
                    {(value: string | null) => (value ? tTypes(value) : t('typePlaceholder'))}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {tTypes(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError>{fieldMessage(errors.type?.message)}</FieldError>
        </Field>

        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor="description">{t('descriptionLabel')}</FieldLabel>
          <Textarea id="description" rows={4} {...register('description')} />
          <FieldError>{fieldMessage(errors.description?.message)}</FieldError>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.eventDate}>
            <FieldLabel htmlFor="eventDate">{t('eventDateLabel')}</FieldLabel>
            <Input id="eventDate" type="datetime-local" {...register('eventDate')} />
            <FieldError>{fieldMessage(errors.eventDate?.message)}</FieldError>
          </Field>

          <Field data-invalid={!!errors.rsvpDeadline}>
            <FieldLabel htmlFor="rsvpDeadline">{t('rsvpDeadlineLabel')}</FieldLabel>
            <Input id="rsvpDeadline" type="datetime-local" {...register('rsvpDeadline')} />
            <FieldError>{fieldMessage(errors.rsvpDeadline?.message)}</FieldError>
          </Field>
        </div>

        <Field data-invalid={!!errors.locationText}>
          <FieldLabel htmlFor="locationText">{t('locationTextLabel')}</FieldLabel>
          <Input id="locationText" {...register('locationText')} />
          <FieldError>{fieldMessage(errors.locationText?.message)}</FieldError>
        </Field>

        <Field data-invalid={!!errors.locationMapUrl}>
          <FieldLabel htmlFor="locationMapUrl">{t('locationMapUrlLabel')}</FieldLabel>
          <Controller
            control={control}
            name="locationMapUrl"
            render={({ field }) => (
              <LocationMapPicker value={field.value ?? ''} onChange={field.onChange} />
            )}
          />
          <FieldError>{fieldMessage(errors.locationMapUrl?.message)}</FieldError>
        </Field>

        <Field data-invalid={!!errors.coverImageUrl}>
          <FieldLabel htmlFor="coverImageUrl">{t('coverImageUrlLabel')}</FieldLabel>
          <Controller
            control={control}
            name="coverImageUrl"
            render={({ field }) => (
              <CoverImageUpload value={field.value ?? ''} onChange={field.onChange} />
            )}
          />
          <FieldError>{fieldMessage(errors.coverImageUrl?.message)}</FieldError>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="primaryLocale">{t('primaryLocaleLabel')}</FieldLabel>
            <Controller
              control={control}
              name="primaryLocale"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="primaryLocale" className="w-full">
                    <SelectValue>
                      {(value: string | null) => t(value === 'ar' ? 'localeAr' : 'localeEn')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {eventLocales.map((locale) => (
                      <SelectItem key={locale} value={locale}>
                        {t(locale === 'ar' ? 'localeAr' : 'localeEn')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="visibility">{t('visibilityLabel')}</FieldLabel>
            <Controller
              control={control}
              name="visibility"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="visibility" className="w-full">
                    <SelectValue>
                      {(value: string | null) =>
                        t(value === 'public' ? 'visibilityPublic' : 'visibilityPrivate')
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {eventVisibilities.map((visibility) => (
                      <SelectItem key={visibility} value={visibility}>
                        {t(visibility === 'public' ? 'visibilityPublic' : 'visibilityPrivate')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </div>

        {track === 'rsvp' && !event && (
          <InlineQuestionsBuilder value={questions} onChange={setQuestions} />
        )}

        {/* isRsvpEnabled isn't exposed — every event collects RSVP responses
            (see createEventAction's server-side check), so there's nothing
            to toggle. Its value still round-trips through
            defaultValues/onSubmit unchanged, which matters for editing an
            event created before this was the case. eventEndDate (for
            multi-day events) similarly has a column and round-trips, but
            no input control yet — not part of this pass. */}

        <Field orientation="horizontal">
          <FieldLabel htmlFor="isQrEnabled" className="flex-1 font-normal">
            {t('isQrEnabledLabel')}
            <FieldDescription>{t('isQrEnabledHint')}</FieldDescription>
          </FieldLabel>
          <Controller
            control={control}
            name="isQrEnabled"
            render={({ field }) => (
              <Switch id="isQrEnabled" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </Field>

        <Field orientation="horizontal">
          <FieldLabel htmlFor="isPasswordProtected" className="flex-1 font-normal">
            {t('isPasswordProtectedLabel')}
          </FieldLabel>
          <Controller
            control={control}
            name="isPasswordProtected"
            render={({ field }) => (
              <Switch
                id="isPasswordProtected"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </Field>

        {isPasswordProtected && (
          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="password">{t('passwordLabel')}</FieldLabel>
            <Input
              id="password"
              type="text"
              autoComplete="off"
              placeholder={event?.password_hash ? t('passwordKeepPlaceholder') : undefined}
              {...register('password')}
            />
            <FieldError>{fieldMessage(errors.password?.message)}</FieldError>
          </Field>
        )}

        <Button type="submit" disabled={isPending} className="w-full sm:w-fit">
          {isPending ? t('submitting') : event ? t('submitEdit') : t('submitCreate')}
        </Button>
      </FieldGroup>
    </form>
  );
}
