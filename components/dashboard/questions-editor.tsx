'use client';

import { useState, useTransition } from 'react';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import {
  questionsFormSchema,
  questionTypes,
  type QuestionsFormInput,
} from '@/lib/validations/questions';
import { saveQuestionsAction } from '@/lib/actions/questions';
import type { QuestionWithOptions } from '@/lib/services/questions.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Field, FieldLabel, FieldGroup, FieldError } from '@/components/ui/field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2Icon, PlusIcon } from 'lucide-react';

const CHOICE_TYPES = ['single_choice', 'multi_choice'];

export function QuestionsEditor({
  eventId,
  initialQuestions,
}: {
  eventId: string;
  initialQuestions: QuestionWithOptions[];
}) {
  const t = useTranslations('Questions');
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { control, register, handleSubmit, watch } = useForm<QuestionsFormInput>({
    resolver: zodResolver(questionsFormSchema),
    defaultValues: {
      questions: initialQuestions.map((q) => ({
        id: q.id,
        textAr: q.question_text_ar,
        textEn: q.question_text_en ?? '',
        type: q.type,
        isRequired: q.is_required,
        options: q.options.map((o) => ({
          id: o.id,
          textAr: o.option_text_ar,
          textEn: o.option_text_en ?? '',
        })),
      })),
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'questions' });

  function onSubmit(values: QuestionsFormInput) {
    setServerError(null);
    setSuccess(false);
    const formData = new FormData();
    formData.set('questions', JSON.stringify(values.questions));

    startTransition(async () => {
      const result = await saveQuestionsAction(eventId, {}, formData);
      if (result?.error) setServerError(result.error);
      else setSuccess(true);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{t(`errors.${serverError}` as 'errors.unknown')}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <AlertDescription>{t('saved')}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-4">
        {fields.map((field, index) => {
          const type = watch(`questions.${index}.type`);
          return (
            <Card key={field.id}>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-muted-foreground text-sm font-medium">
                    {t('questionNumber', { number: index + 1 })}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => remove(index)}
                  >
                    <Trash2Icon />
                  </Button>
                </div>

                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor={`questions.${index}.textAr`}>
                      {t('questionTextArLabel')}
                    </FieldLabel>
                    <Input
                      id={`questions.${index}.textAr`}
                      {...register(`questions.${index}.textAr`)}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor={`questions.${index}.textEn`}>
                      {t('questionTextEnLabel')}
                    </FieldLabel>
                    <Input
                      id={`questions.${index}.textEn`}
                      {...register(`questions.${index}.textEn`)}
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor={`questions.${index}.type`}>{t('typeLabel')}</FieldLabel>
                      <Controller
                        control={control}
                        name={`questions.${index}.type`}
                        render={({ field: typeField }) => (
                          <Select value={typeField.value} onValueChange={typeField.onChange}>
                            <SelectTrigger id={`questions.${index}.type`} className="w-full">
                              <SelectValue>
                                {(value: string | null) =>
                                  value ? t(`types.${value}` as 'types.short_text') : ''
                                }
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {questionTypes.map((qType) => (
                                <SelectItem key={qType} value={qType}>
                                  {t(`types.${qType}`)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </Field>

                    <Field orientation="horizontal">
                      <FieldLabel
                        htmlFor={`questions.${index}.isRequired`}
                        className="flex-1 font-normal"
                      >
                        {t('isRequiredLabel')}
                      </FieldLabel>
                      <Controller
                        control={control}
                        name={`questions.${index}.isRequired`}
                        render={({ field: reqField }) => (
                          <Switch
                            id={`questions.${index}.isRequired`}
                            checked={reqField.value}
                            onCheckedChange={reqField.onChange}
                          />
                        )}
                      />
                    </Field>
                  </div>

                  {CHOICE_TYPES.includes(type) && (
                    <QuestionOptionsEditor control={control} questionIndex={index} t={t} />
                  )}
                </FieldGroup>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() =>
          append({
            textAr: '',
            textEn: '',
            type: 'short_text',
            isRequired: false,
            options: [],
          })
        }
        className="w-fit"
      >
        <PlusIcon /> {t('addQuestion')}
      </Button>

      <Button type="submit" disabled={isPending} className="w-full sm:w-fit">
        {isPending ? t('saving') : t('save')}
      </Button>
    </form>
  );
}

function QuestionOptionsEditor({
  control,
  questionIndex,
  t,
}: {
  control: ReturnType<typeof useForm<QuestionsFormInput>>['control'];
  questionIndex: number;
  t: ReturnType<typeof useTranslations<'Questions'>>;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `questions.${questionIndex}.options`,
  });

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <span className="text-sm font-medium">{t('optionsLabel')}</span>
      {fields.map((field, optionIndex) => (
        <div key={field.id} className="flex items-center gap-2">
          <Controller
            control={control}
            name={`questions.${questionIndex}.options.${optionIndex}.textAr`}
            render={({ field: f }) => <Input {...f} placeholder={t('optionTextArPlaceholder')} />}
          />
          <Controller
            control={control}
            name={`questions.${questionIndex}.options.${optionIndex}.textEn`}
            render={({ field: f }) => <Input {...f} placeholder={t('optionTextEnPlaceholder')} />}
          />
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(optionIndex)}>
            <Trash2Icon />
          </Button>
        </div>
      ))}
      <FieldError>{fields.length < 2 ? t('errors.optionsMinimum') : undefined}</FieldError>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() => append({ textAr: '', textEn: '' })}
      >
        <PlusIcon /> {t('addOption')}
      </Button>
    </div>
  );
}
