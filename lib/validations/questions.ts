import { z } from 'zod';

export const questionTypes = [
  'short_text',
  'long_text',
  'yes_no',
  'single_choice',
  'multi_choice',
  'number',
] as const;

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
