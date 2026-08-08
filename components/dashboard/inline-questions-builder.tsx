'use client';

import { useTranslations } from 'next-intl';
import { questionTypes } from '@/lib/validations/questions';
import type { QuestionInput } from '@/lib/validations/questions';
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
import { Field, FieldLabel, FieldGroup } from '@/components/ui/field';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2Icon, PlusIcon } from 'lucide-react';

const CHOICE_TYPES = ['single_choice', 'multi_choice'];

const emptyQuestion: QuestionInput = {
  textAr: '',
  textEn: '',
  type: 'short_text',
  isRequired: false,
  options: [],
};

/**
 * Lets the organizer write their poll questions right inside the "create
 * new RSVP" form, instead of only being able to add them afterward from a
 * separate settings page. Deliberately uses plain local state (not
 * react-hook-form) so it can live inside EventForm's own <form> without
 * merging two independent validation schemas — a blank/incomplete draft
 * question here never blocks the event itself from being created; see
 * createEventAction, which saves whatever validates and silently skips
 * the rest (fixable later from the RSVP settings page).
 */
export function InlineQuestionsBuilder({
  value,
  onChange,
}: {
  value: QuestionInput[];
  onChange: (next: QuestionInput[]) => void;
}) {
  const t = useTranslations('Questions');
  const tForm = useTranslations('Events.form');

  function updateQuestion(index: number, patch: Partial<QuestionInput>) {
    onChange(value.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function removeQuestion(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function updateOption(
    qIndex: number,
    oIndex: number,
    patch: Partial<{ textAr: string; textEn: string }>,
  ) {
    const q = value[qIndex];
    updateQuestion(qIndex, {
      options: q.options.map((o, i) => (i === oIndex ? { ...o, ...patch } : o)),
    });
  }

  function addOption(qIndex: number) {
    const q = value[qIndex];
    updateQuestion(qIndex, { options: [...q.options, { textAr: '', textEn: '' }] });
  }

  function removeOption(qIndex: number, oIndex: number) {
    const q = value[qIndex];
    updateQuestion(qIndex, { options: q.options.filter((_, i) => i !== oIndex) });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border p-4">
      <div>
        <h3 className="text-sm font-bold">{tForm('questionsInlineTitle')}</h3>
        <p className="text-muted-foreground text-sm">{tForm('questionsInlineHint')}</p>
      </div>

      {value.length === 0 && (
        <p className="text-muted-foreground text-sm">{tForm('questionsInlineEmpty')}</p>
      )}

      <div className="flex flex-col gap-4">
        {value.map((q, index) => (
          <Card key={index}>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-2">
                <span className="text-muted-foreground text-sm font-medium">
                  {t('questionNumber', { number: index + 1 })}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeQuestion(index)}
                >
                  <Trash2Icon />
                </Button>
              </div>

              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor={`inline-q-${index}-ar`}>
                    {t('questionTextArLabel')}
                  </FieldLabel>
                  <Input
                    id={`inline-q-${index}-ar`}
                    value={q.textAr}
                    onChange={(e) => updateQuestion(index, { textAr: e.target.value })}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor={`inline-q-${index}-en`}>
                    {t('questionTextEnLabel')}
                  </FieldLabel>
                  <Input
                    id={`inline-q-${index}-en`}
                    value={q.textEn}
                    onChange={(e) => updateQuestion(index, { textEn: e.target.value })}
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor={`inline-q-${index}-type`}>{t('typeLabel')}</FieldLabel>
                    <Select
                      value={q.type}
                      onValueChange={(v) =>
                        updateQuestion(index, { type: v as QuestionInput['type'] })
                      }
                    >
                      <SelectTrigger id={`inline-q-${index}-type`} className="w-full">
                        <SelectValue>
                          {(v: string | null) => (v ? t(`types.${v}` as 'types.short_text') : '')}
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
                  </Field>

                  <Field orientation="horizontal">
                    <FieldLabel
                      htmlFor={`inline-q-${index}-required`}
                      className="flex-1 font-normal"
                    >
                      {t('isRequiredLabel')}
                    </FieldLabel>
                    <Switch
                      id={`inline-q-${index}-required`}
                      checked={q.isRequired}
                      onCheckedChange={(v) => updateQuestion(index, { isRequired: v })}
                    />
                  </Field>
                </div>

                {CHOICE_TYPES.includes(q.type) && (
                  <div className="flex flex-col gap-2 rounded-lg border p-3">
                    <span className="text-sm font-medium">{t('optionsLabel')}</span>
                    {q.options.map((o, oIndex) => (
                      <div key={oIndex} className="flex items-center gap-2">
                        <Input
                          value={o.textAr}
                          onChange={(e) => updateOption(index, oIndex, { textAr: e.target.value })}
                          placeholder={t('optionTextArPlaceholder')}
                        />
                        <Input
                          value={o.textEn}
                          onChange={(e) => updateOption(index, oIndex, { textEn: e.target.value })}
                          placeholder={t('optionTextEnPlaceholder')}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeOption(index, oIndex)}
                        >
                          <Trash2Icon />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-fit"
                      onClick={() => addOption(index)}
                    >
                      <PlusIcon /> {t('addOption')}
                    </Button>
                  </div>
                )}
              </FieldGroup>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() => onChange([...value, { ...emptyQuestion }])}
        className="w-fit"
      >
        <PlusIcon /> {t('addQuestion')}
      </Button>
    </div>
  );
}
