import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

type Client = SupabaseClient<Database>;
export type ReminderRow = Database['public']['Tables']['event_reminders']['Row'];

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Creates/updates the two standing reminders (day-before, day-after) for an
 * event whenever its event_date is set or changed. Called from
 * createEvent/updateEvent — never exposed as its own action, since a
 * reminder's schedule only ever follows the event's own date.
 *
 * Deliberately only touches rows still in 'scheduled' state: once a
 * reminder has been sent or the organizer canceled it, changing the event
 * date slightly shouldn't silently resurrect or re-time it. If the event
 * date is cleared entirely, both reminders are canceled outright — there's
 * nothing left to count a day from.
 */
export async function upsertEventReminders(
  supabase: Client,
  eventId: string,
  eventDate: string | null,
): Promise<void> {
  if (!eventDate) {
    await supabase
      .from('event_reminders')
      .update({ status: 'canceled' })
      .eq('event_id', eventId)
      .eq('status', 'scheduled');
    return;
  }

  const eventTime = new Date(eventDate).getTime();
  if (Number.isNaN(eventTime)) return;

  const rows: { event_id: string; kind: 'day_before' | 'day_after'; scheduled_at: string }[] = [
    {
      event_id: eventId,
      kind: 'day_before',
      scheduled_at: new Date(eventTime - DAY_MS).toISOString(),
    },
    {
      event_id: eventId,
      kind: 'day_after',
      scheduled_at: new Date(eventTime + DAY_MS).toISOString(),
    },
  ];

  for (const row of rows) {
    const { data: existing } = await supabase
      .from('event_reminders')
      .select('id, status')
      .eq('event_id', eventId)
      .eq('kind', row.kind)
      .maybeSingle();

    if (!existing) {
      await supabase.from('event_reminders').insert(row);
    } else if (existing.status === 'scheduled') {
      await supabase
        .from('event_reminders')
        .update({ scheduled_at: row.scheduled_at })
        .eq('id', existing.id);
    }
    // Already sent/canceled: leave it alone.
  }
}

export async function listEventReminders(
  supabase: Client,
  eventId: string,
): Promise<ReminderRow[]> {
  const { data, error } = await supabase
    .from('event_reminders')
    .select('*')
    .eq('event_id', eventId)
    .order('scheduled_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function cancelEventReminder(supabase: Client, reminderId: string): Promise<void> {
  const { error } = await supabase
    .from('event_reminders')
    .update({ status: 'canceled' })
    .eq('id', reminderId)
    .eq('status', 'scheduled');

  if (error) throw error;
}
