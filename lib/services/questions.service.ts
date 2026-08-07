import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { QuestionInput } from '@/lib/validations/questions';

type Client = SupabaseClient<Database>;
type QuestionRow = Database['public']['Tables']['custom_questions']['Row'];
type QuestionOptionRow = Database['public']['Tables']['custom_question_options']['Row'];

export type QuestionWithOptions = QuestionRow & { options: QuestionOptionRow[] };

export async function listQuestions(
  supabase: Client,
  eventId: string,
): Promise<QuestionWithOptions[]> {
  const { data: questions, error } = await supabase
    .from('custom_questions')
    .select('*')
    .eq('event_id', eventId)
    .order('display_order', { ascending: true });

  if (error) throw error;
  if (questions.length === 0) return [];

  const { data: options, error: optionsError } = await supabase
    .from('custom_question_options')
    .select('*')
    .in(
      'question_id',
      questions.map((q) => q.id),
    )
    .order('display_order', { ascending: true });

  if (optionsError) throw optionsError;

  return questions.map((q) => ({
    ...q,
    options: options.filter((o) => o.question_id === q.id),
  }));
}

/** Replaces all custom questions for an event with the given list (delete + recreate). */
export async function replaceQuestions(
  supabase: Client,
  eventId: string,
  questions: QuestionInput[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('custom_questions')
    .delete()
    .eq('event_id', eventId);
  if (deleteError) throw deleteError;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const { data: inserted, error: insertError } = await supabase
      .from('custom_questions')
      .insert({
        event_id: eventId,
        question_text_ar: q.textAr,
        question_text_en: q.textEn || null,
        type: q.type,
        is_required: q.isRequired,
        display_order: i,
      })
      .select('id')
      .single();

    if (insertError) throw insertError;

    if (['single_choice', 'multi_choice'].includes(q.type) && q.options.length > 0) {
      const { error: optionsError } = await supabase.from('custom_question_options').insert(
        q.options.map((option, index) => ({
          question_id: inserted.id,
          option_text_ar: option.textAr,
          option_text_en: option.textEn || null,
          display_order: index,
        })),
      );
      if (optionsError) throw optionsError;
    }
  }
}
