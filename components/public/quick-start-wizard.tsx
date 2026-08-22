'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
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
import { CoverImagePicker } from '@/components/public/cover-image-picker';
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

// Where an in-progress, not-yet-authenticated draft is parked while the
// organizer goes through /register — sessionStorage rather than
// localStorage because a half-filled draft from a different event
// shouldn't quietly resurrect itself in a future unrelated tab. Keyed by
// track since the two tracks have different final actions/fields.
function draftKey(track: 'invitation' | 'rsvp') {
  return `mahalli:quick-start-draft:${track}`;
}

type StoredDraft = {
  values: FormValues;
  questions: QuestionInput[];
  guestName: string;
  guestPhone: string;
  sendTrial: boolean;
};

/**
 * The full, real event-creation form — the same core fields as the
 * authenticated dashboard's EventForm. Open to anyone, logged in or not:
 * only the very last step's action (try/create/approve) needs an
 * account, so that's the only point this ever asks for one. Presented as
 * steps with Next/Back instead of one long scroll: a single page with
 * every field visible at once read like a test to fill out, not
 * something you'd enjoy doing. Each step keeps the same react-hook-form
 * instance — there's no per-step form boundary, just conditional
 * rendering of one step's fields at a time, so nothing is lost moving
 * back and forth.
 *
 * Anonymous finish: submit() stashes the filled-in draft in
 * sessionStorage and sends the organizer to /register?next=/start/track
 * instead of calling the server action (which requires a session
 * anyway). The restore effect below runs when this page mounts again
 * post-login, refills every field from the stash, and re-fires the same
 * action automatically — the organizer never has to notice the detour or
 * press the button twice.
 */
export function QuickStartWizard({
  track,
  isAuthenticated,
}: {
  track: 'invitation' | 'rsvp';
  isAuthenticated: boolean;
}) {
  const t = useTranslations('QuickStart');
  const tForm = useTranslations('Events.form');
  const tTypes = useTranslations('Events.types');
  const tSettings = useTranslations('EventSettings');
  const locale = useLocale();
  const router = useRouter();
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
  // Starts false on both server and client — flips true only once the
  // effect below actually finds a draft to resume, never from the
  // isAuthenticated prop directly, so an ordinary authenticated visit
  // with nothing to restore never shows a spinner before the form.
  const [isRestoring, setIsRestoring] = useState(false);
  const hasCheckedDraftRef = useRef(false);

  const steps: readonly StepId[] = STEP_IDS;
  const stepId = steps[stepIndex]!;

  // Takes questions/guestName/guestPhone as explicit arguments rather
  // than reading them off component state — the restore path below calls
  // this in the same tick as the setQuestions/setGuestName/setGuestPhone
  // calls that populate them, and those setters don't mutate the
  // current closure's values, only schedule a future render. Reading
  // state directly here would silently submit the pre-restore (empty)
  // values instead of the restored draft.
  function runCreate(
    values: FormValues,
    sendTrial: boolean,
    guest: { questions: QuestionInput[]; guestName: string; guestPhone: string },
  ) {
    startTransition(async () => {
      const result = await createEventFromQuickStartAction(
        {
          track,
          ...values,
          questions: guest.questions,
          guestName: track === 'invitation' ? guest.guestName : '',
          guestPhone: track === 'invitation' ? guest.guestPhone : '',
        },
        { sendTrial },
      );
      // No success branch: the action redirects internally when it works.
      if (result?.error) setSubmitError(t('finish.error'));
    });
  }

  // Picks back up a draft parked before the /register detour — only ever
  // matters right after that round trip, so it's a one-shot check on
  // mount, not something that re-runs as the organizer edits fields.
  // Guarded on isAuthenticated: an anonymous visit never has a draft of
  // its own to restore (nothing gets stashed until submit() sends them
  // away), and racing this against a session that hasn't loaded yet
  // would just silently drop the restore.
  useEffect(() => {
    if (hasCheckedDraftRef.current) return;
    hasCheckedDraftRef.current = true;

    if (!isAuthenticated) return;

    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(draftKey(track));
      if (raw) sessionStorage.removeItem(draftKey(track));
    } catch {
      // Private-mode/quota failures just mean nothing to restore.
    }
    if (!raw) return;

    let draft: StoredDraft;
    try {
      draft = JSON.parse(raw) as StoredDraft;
    } catch {
      return;
    }

    // Setting isRestoring here (rather than leaving it false) is what
    // keeps this transition spinner-to-spinner instead of flashing the
    // now-filled final step for a frame before runCreate's own isPending
    // takes over.
    setIsRestoring(true);
    (Object.keys(draft.values) as Array<keyof FormValues>).forEach((key) => {
      setValue(key, draft.values[key]);
    });
    setQuestions(draft.questions);
    setGuestName(draft.guestName);
    setGuestPhone(draft.guestPhone);
    setStepIndex(steps.length - 1);
    runCreate(draft.values, draft.sendTrial, {
      questions: draft.questions,
      guestName: draft.guestName,
      guestPhone: draft.guestPhone,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot restore-on-mount, not a reactive effect
  }, []);

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

    if (!isAuthenticated) {
      // Park everything filled in so far and send the organizer to log
      // in — the account is only needed now, at the very last step, not
      // before. `next` brings them straight back to this exact page; the
      // restore effect above finishes the job the moment they're back
      // and authenticated, no second click needed.
      try {
        sessionStorage.setItem(
          draftKey(track),
          JSON.stringify({
            values,
            questions,
            guestName,
            guestPhone,
            sendTrial,
          } satisfies StoredDraft),
        );
      } catch {
        // sessionStorage can fail (private mode, quota) — they'll just
        // need to re-fill after logging in instead of resuming.
      }
      router.push(`/register?next=${encodeURIComponent(`/${locale}/start/${track}`)}`);
      return;
    }

    runCreate(values, sendTrial, { questions, guestName, guestPhone });
  }

  if (isPending || isRestoring) {
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
                render={({ field }) =>
                  // The template gallery is wedding-specific content, so it
                  // only replaces the plain upload on the invitation track —
                  // the link track keeps the same upload-only field it had.
                  track === 'invitation' ? (
                    <CoverImagePicker value={field.value} onChange={field.onChange} />
                  ) : (
                    <CoverImageUpload value={field.value} onChange={field.onChange} />
                  )
                }
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
                    <PhoneInput
                      id="qs-guest-phone"
                      aria-invalid={guestError}
                      value={guestPhone}
                      onChange={(phone) => {
                        setGuestPhone(phone);
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
            no per-guest trial concept at all, so it just gets one.
            Skip sits beside Next on every step but the first: nothing on
            datetime/design/settings was ever actually required to
            advance (goNext only validates the event name, on 'basics'),
            but that was only true in the code — an organizer looking at
            a field with no obvious way past it has no reason to know
            that. Skip is the same goNext() call under a name that says
            the quiet part out loud: leaving this blank is fine. */}
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
            <div className="flex items-center gap-2">
              {stepId !== 'basics' && (
                <Button type="button" variant="ghost" onClick={goNext}>
                  {t('skipButton')}
                </Button>
              )}
              <Button type="button" onClick={goNext}>
                {t('nextButton')}
                <ArrowIcon className="size-4 rtl:rotate-180" />
              </Button>
            </div>
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
