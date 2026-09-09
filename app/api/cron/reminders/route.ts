import { timingSafeEqual } from 'node:crypto';
import { formatDateTime } from '@/lib/utils/format-date';
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { whatsAppProvider, isWhatsAppConfigured } from '@/lib/whatsapp';

/**
 * Sends due event reminders (day-before / day-after, see
 * supabase/migrations/20260817000001_institutional_and_reminders.sql and
 * lib/services/reminders.service.ts) and marks them 'sent'. Meant to be
 * hit on a schedule — Railway's persistent web service has no built-in
 * cron the way Vercel does, so this needs an external trigger: a Railway
 * Cron Job service (Deploy → New → Cron Job → curl this URL), a GitHub
 * Actions scheduled workflow, or a free pinger like cron-job.org, hitting
 * this every 15–30 minutes.
 *
 * Reminds only guests who replied "attending" — a day-before nudge or a
 * day-after thank-you to someone who declined or never answered would be
 * noise, not hospitality.
 *
 * ⚠️ Like the WhatsApp/Moyasar webhooks, this hasn't been exercised end to
 * end against a live cron trigger + WhatsApp Business account in this
 * environment — the logic is straightforward (query due rows, send, mark
 * sent) but worth a manual GET once CRON_SECRET and WhatsApp are both
 * configured, before trusting it unattended.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('[cron/reminders] CRON_SECRET is not set — rejecting');
    return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  }

  // Header only, compared in constant time — matching broadcast-results,
  // which already did this. Accepting ?secret= put CRON_SECRET into access
  // logs, proxy logs and any Referer, and `!==` on a secret leaks its
  // prefix through timing.
  const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!isWhatsAppConfigured()) {
    return NextResponse.json({
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 'whatsapp_not_configured',
    });
  }

  const admin = createAdminClient();

  const { data: due, error: dueError } = await admin
    .from('event_reminders')
    .select('id, event_id, kind')
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString());

  if (dueError) {
    console.error('[cron/reminders] failed to load due reminders', dueError);
    return NextResponse.json({ error: 'unknown' }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  for (const reminder of due) {
    // Claim the row before doing any work. The status flip used to happen
    // only after the whole per-guest loop, so two overlapping runs both saw
    // the same rows and every guest got the reminder twice — and a run that
    // died mid-loop left the row 'scheduled', so the next run re-sent to
    // everyone including those already reached. The conditional update is
    // atomic: whoever flips it first is the only one that proceeds.
    const { data: claimed } = await admin
      .from('event_reminders')
      .update({ status: 'sending' })
      .eq('id', reminder.id)
      .eq('status', 'scheduled')
      .select('id')
      .maybeSingle();
    if (!claimed) continue;

    const { data: event } = await admin
      .from('events')
      .select('name, slug, event_date, location_text, primary_locale, status')
      .eq('id', reminder.event_id)
      .is('deleted_at', null)
      .single();

    // The event may have been unpublished or deleted since the reminder was
    // scheduled — mark it sent (i.e. done, nothing more to do) rather than
    // leaving it to retry forever. softDeleteEvent leaves status as
    // 'published' and never cancels the event's reminders, so without the
    // deleted_at filter above a cancelled event still WhatsApped every
    // attending guest "your event is tomorrow".
    if (!event || event.status !== 'published') {
      await admin
        .from('event_reminders')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', reminder.id);
      continue;
    }

    const { data: responses } = await admin
      .from('rsvp_responses')
      .select('guest_id')
      .eq('event_id', reminder.event_id)
      .eq('status', 'attending');

    const guestIds = (responses ?? []).map((r) => r.guest_id);
    const { data: guests } =
      guestIds.length > 0
        ? await admin.from('guests').select('phone').in('id', guestIds).is('deleted_at', null)
        : { data: [] as { phone: string | null }[] };

    const phones = (guests ?? []).map((g) => g.phone).filter((p): p is string => Boolean(p));
    const locale = event.primary_locale === 'en' ? 'en' : 'ar';
    const text = reminderText(reminder.kind as 'day_before' | 'day_after', event, locale);

    for (const phone of phones) {
      try {
        // Reminders and thank-yous land days after the guest last
        // touched us, so they are always outside Meta's 24-hour window
        // and always need a template. Free-form here failed with 131047
        // for every guest — silently, because the cron never ran either.
        const templateEnv =
          reminder.kind === 'day_before'
            ? process.env.WHATSAPP_REMINDER_TEMPLATE
            : process.env.WHATSAPP_THANKS_TEMPLATE;
        const template = templateEnv
          ? {
              name: templateEnv,
              language: locale,
              bodyParams:
                reminder.kind === 'day_before'
                  ? [
                      event.name,
                      formatDateTime(event.event_date, locale),
                      event.location_text ?? '—',
                    ]
                  : [event.name],
            }
          : undefined;
        await whatsAppProvider.send({ to: phone, text, template });
        sent += 1;
      } catch (error) {
        console.error('[cron/reminders] send failed', error);
        failed += 1;
      }
    }

    await admin
      .from('event_reminders')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', reminder.id);
  }

  return NextResponse.json({ processed: due.length, sent, failed });
}

function reminderText(
  kind: 'day_before' | 'day_after',
  event: { name: string; event_date: string | null; location_text: string | null },
  locale: 'ar' | 'en',
): string {
  const when = event.event_date ? formatDateTime(event.event_date, locale) : '';
  const where = event.location_text ?? '';

  if (kind === 'day_before') {
    return locale === 'ar'
      ? `تذكير: "${event.name}" غدًا${when ? ` — ${when}` : ''}${where ? `\nالموقع: ${where}` : ''}. بانتظاركم!`
      : `Reminder: "${event.name}" is tomorrow${when ? ` — ${when}` : ''}${where ? `\nLocation: ${where}` : ''}. See you there!`;
  }

  return locale === 'ar'
    ? `شكرًا لحضوركم "${event.name}"! يسعدنا انضمامكم إلينا.`
    : `Thank you for attending "${event.name}"! It was wonderful having you.`;
}
