'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { updateRsvpAction, type RsvpActionState } from '@/lib/actions/rsvp';
import type { QuestionWithOptions } from '@/lib/services/questions.service';
import type { RsvpByToken } from '@/lib/services/rsvp.service';
import {
  CustomQuestionField,
  hasAllRequiredAnswers,
} from '@/components/public/custom-question-field';

type FormValues = {
  answers: Record<string, string | string[] | boolean>;
};

/**
 * The standalone edit screen for an existing guest's question answers —
 * a new guest never sees this separately anymore (see rsvp-form.tsx,
 * which now collects questions inline on first submission), but someone
 * revisiting their edit link after already answering still needs a way
 * to change those answers on their own, without re-submitting their
 * whole Accept/Decline. Reuses the same response record (via
 * updateRsvpAction) but resubmits the guest's existing
 * status/companions/message unchanged, so this screen only ever touches
 * question answers.
 */
export function RsvpQuestionsForm({
  token,
  data,
  questions,
}: {
  token: string;
  data: RsvpByToken;
  questions: QuestionWithOptions[];
}) {
  const t = useTranslations('Rsvp');
  const tErrors = useTranslations('Rsvp.errors');
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const existingAnswers = Object.fromEntries(
    data.answers.map((a) => [a.question_id, a.answer_value as string | string[] | boolean]),
  );

  const { control, handleSubmit } = useForm<FormValues>({
    defaultValues: { answers: existingAnswers },
  });

  function onSubmit(values: FormValues) {
    setServerError(null);
    setSaved(false);

    if (!hasAllRequiredAnswers(questions, values.answers)) {
      setServerError('answerRequired');
      return;
    }

    const formData = new FormData();
    // Preserve the guest's existing invitation response untouched — this
    // screen only edits question answers. status/companions_names can be
    // null if this guest somehow reaches the questions follow-up before
    // ever answering Accept/Decline (get_rsvp_by_token LEFT JOINs the
    // response) — send '' rather than crash; the server rejects an empty
    // status same as any other invalid one, with a real error message
    // instead of a client-side throw.
    formData.set('status', data.response.status ?? '');
    formData.set('message', data.response.message ?? '');
    formData.set('companionsNames', JSON.stringify(data.response.companions_names ?? []));
    formData.set(
      'answers',
      JSON.stringify(
        questions
          .filter((q) => values.answers[q.id] !== undefined)
          .map((q) => ({ question_id: q.id, answer_value: values.answers[q.id] })),
      ),
    );

    startTransition(async () => {
      const result: RsvpActionState = await updateRsvpAction(token, {}, formData);
      if (result.error) setServerError(result.error);
      else setSaved(true);
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-card flex flex-col gap-6 rounded-3xl border p-5 shadow-sm sm:p-7"
    >
      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{tErrors(serverError as 'invalidInput')}</AlertDescription>
        </Alert>
      )}
      {saved && (
        <Alert>
          <AlertDescription>{t('updateSaved')}</AlertDescription>
        </Alert>
      )}

      <FieldGroup>
        {questions.map((question) => (
          <CustomQuestionField key={question.id} question={question} control={control as never} />
        ))}

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? t('submitting') : t('saveChanges')}
        </Button>
      </FieldGroup>
    </form>
  );
}
