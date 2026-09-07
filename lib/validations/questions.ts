import { z } from 'zod';

export const questionTypes = [
  'short_text',
  'long_text',
  'yes_no',
  'single_choice',
  'multi_choice',
  'number',
] as const;

// The full six-type set above still validates and renders for existing
// questions (long_text/single_choice/number were real, already-created
// answer types) — but offering all six when writing a *new* question was
// confusing overlap (short vs. long text, single vs. multi choice) for a
// distinction organizers didn't actually care about. New questions only
// ever offer these three: short_text now also stands in for what used to
// be long_text/number (one free-text answer, digits or words), and
// multi_choice stands in for single_choice too (the UI itself makes
// "pick one" the default and doesn't force selecting more).
export const CREATABLE_QUESTION_TYPES = ['yes_no', 'multi_choice', 'short_text'] as const;

export const questionOptionSchema = z.object({
  id: z.string().optional(),
  textAr: z.string().trim().min(1, { error: 'optionTextRequired' }),
  textEn: z.string().trim().optional(),
});

export const questionSchema = z
  .object({
    id: z.string().optional(),
    textAr: z.string().trim().min(1, { error: 'questionTextRequired' }),
    textEn: z.string().trim().optional(),
    type: z.enum(questionTypes),
    isRequired: z.boolean(),
    options: z.array(questionOptionSchema),
  })
  .refine(
    (data) => !['single_choice', 'multi_choice'].includes(data.type) || data.options.length >= 2,
    { path: ['options'], error: 'optionsMinimum' },
  );

export const questionsFormSchema = z.object({
  questions: z.array(questionSchema),
});

export type QuestionInput = z.infer<typeof questionSchema>;
export type QuestionsFormInput = z.infer<typeof questionsFormSchema>;
