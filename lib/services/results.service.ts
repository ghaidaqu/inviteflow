import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { sendResultsBroadcastEmail } from '@/lib/email/notify';
import { sendResultsBroadcastWhatsApp } from '@/lib/whatsapp/notify';

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
    totalResponses: responses.length,
    questions: questionTallies,
  };
}

export type BroadcastEventResultsResult = { sentCount: number; totalGuests: number };

/**
 * The actual "email/WhatsApp every guest the results" work, shared
 * between an organizer's manual broadcastResultsAction (dashboard button)
 * and the deadline-triggered automatic one (see app/api/cron/
 * broadcast-results/route.ts) — same guest loop either way, just a
 * different trigger and a different caller-supplied locale (a manual
 * click uses the organizer's own current locale; the cron job has no
 * request to read one from, so it always uses the event's own
 * primary_locale instead).
 */
export async function broadcastEventResults(
  supabase: Client,
  event: { id: string; name: string; slug: string },
  locale: 'ar' | 'en',
): Promise<BroadcastEventResultsResult> {
  const { data: guests, error: guestsError } = await supabase
    .from('guests')
    .select('name, email, phone')
    .eq('event_id', event.id)
    .is('deleted_at', null);
  if (guestsError) throw guestsError;

  if (guests.length === 0) return { sentCount: 0, totalGuests: 0 };

  const summary = await getResultsSummary(supabase, event.id);

  let sentCount = 0;
  for (const guest of guests) {
    let sent = false;
    if (guest.email) {
      sent = (await sendResultsBroadcastEmail(event.name, guest.email, summary, locale)) || sent;
    }
    if (guest.phone) {
      sent = (await sendResultsBroadcastWhatsApp(event.slug, guest.phone, summary, locale)) || sent;
    }
    if (sent) sentCount += 1;
  }

  return { sentCount, totalGuests: guests.length };
}
