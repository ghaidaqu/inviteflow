'use server';

import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { questionsFormSchema } from '@/lib/validations/questions';
import { getCurrentOrganizationId, getEvent } from '@/lib/services/events.service';
import { replaceQuestions } from '@/lib/services/questions.service';

export type QuestionsActionState = {
  error?: string;
  success?: boolean;
};

export async function saveQuestionsAction(
  eventId: string,
  _prevState: QuestionsActionState,
  formData: FormData,
): Promise<QuestionsActionState> {
  const raw = formData.get('questions');
  if (typeof raw !== 'string') return { error: 'invalidInput' };

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return { error: 'invalidInput' };
  }

  const parsed = questionsFormSchema.safeParse({ questions: parsedJson });
  if (!parsed.success) {
    return { error: 'invalidInput' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthorized' };

  const organizationId = await getCurrentOrganizationId(supabase, user.id);
  if (!organizationId) return { error: 'unknown' };

  const event = await getEvent(supabase, organizationId, eventId);
  if (!event) return { error: 'unknown' };

  try {
    await replaceQuestions(supabase, eventId, parsed.data.questions);
  } catch {
    return { error: 'unknown' };
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/events/${eventId}/rsvp`);

  return { success: true };
}
