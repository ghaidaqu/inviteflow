import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

type Client = SupabaseClient<Database>;

export type QuestionTally = {
  questionTextAr: string;
  questionTextEn: string | null;
  type: string;
  /** null for open-ended types (short/long text, number) — not meaningfully tallied. */
  tally: { labelAr: string; labelEn: string; count: number }[] | null;
};

export type ResultsSummary = {
  attendingCount: number;
  notAttendingCount: number;
  maybeCount: number;
  totalResponses: number;
  questions: QuestionTally[];
};

export async function getResultsSummary(
  supabase: Client,
  eventId: string,
): Promise<ResultsSummary> {
  const { data: responses, error: responsesError } = await supabase
    .from('rsvp_responses')
    .select('id, status')
    .eq('event_id', eventId);
  if (responsesError) throw responsesError;

  const attendingCount = responses.filter((r) => r.status === 'attending').length;
  const notAttendingCount = responses.filter((r) => r.status === 'not_attending').length;
  const maybeCount = responses.filter((r) => r.status === 'maybe').length;

  const { data: questions, error: questionsError } = await supabase
    .from('custom_questions')
    .select('id, question_text_ar, question_text_en, type')
    .eq('event_id', eventId)
    .order('display_order', { ascending: true });
  if (questionsError) throw questionsError;

  const { data: options, error: optionsError } = await supabase
    .from('custom_question_options')
    .select('id, question_id, option_text_ar, option_text_en')
    .in(
      'question_id',
      questions.map((q) => q.id),
    );
  if (optionsError) throw optionsError;

  const responseIds = responses.map((r) => r.id);
  const { data: answers, error: answersError } =
    responseIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from('custom_answers')
          .select('question_id, answer_value')
          .in('response_id', responseIds);
  if (answersError) throw answersError;

  const questionTallies: QuestionTally[] = questions.map((q) => {
    const questionAnswers = answers.filter((a) => a.question_id === q.id);

    if (q.type === 'yes_no') {
      const yes = questionAnswers.filter((a) => a.answer_value === true).length;
      const no = questionAnswers.filter((a) => a.answer_value === false).length;
      return {
        questionTextAr: q.question_text_ar,
        questionTextEn: q.question_text_en,
        type: q.type,
        tally: [
          { labelAr: 'نعم', labelEn: 'Yes', count: yes },
          { labelAr: 'لا', labelEn: 'No', count: no },
        ],
      };
    }

    if (q.type === 'single_choice') {
      const questionOptions = options.filter((o) => o.question_id === q.id);
      return {
        questionTextAr: q.question_text_ar,
        questionTextEn: q.question_text_en,
        type: q.type,
        tally: questionOptions.map((opt) => ({
          labelAr: opt.option_text_ar,
          labelEn: opt.option_text_en ?? opt.option_text_ar,
          count: questionAnswers.filter((a) => a.answer_value === opt.id).length,
        })),
      };
    }

    if (q.type === 'multi_choice') {
      // answer_value is an array of selected option ids here (unlike
      // single_choice's bare id) — a guest can tick more than one.
      const questionOptions = options.filter((o) => o.question_id === q.id);
      return {
        questionTextAr: q.question_text_ar,
        questionTextEn: q.question_text_en,
        type: q.type,
        tally: questionOptions.map((opt) => ({
          labelAr: opt.option_text_ar,
          labelEn: opt.option_text_en ?? opt.option_text_ar,
          count: questionAnswers.filter(
            (a) => Array.isArray(a.answer_value) && a.answer_value.includes(opt.id),
          ).length,
        })),
      };
    }

    return {
      questionTextAr: q.question_text_ar,
      questionTextEn: q.question_text_en,
      type: q.type,
      tally: null,
    };
  });

  return {
    attendingCount,
    notAttendingCount,
    maybeCount,
    totalResponses: responses.length,
    questions: questionTallies,
  };
}
