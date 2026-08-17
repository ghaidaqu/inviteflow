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

  const authHeader = request.headers.get('authorization');
  const provided =
    authHeader?.replace(/^Bearer\s+/i, '') ?? request.nextUrl.searchParams.get('secret');
  if (provided !== secret) {
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
    const { data: event } = await admin
      .from('events')
      .select('name, slug, event_date, location_text, primary_locale, status')
      .eq('id', reminder.event_id)
      .single();

    // The event may have been unpublished/deleted since the reminder was
    // scheduled — mark it sent (i.e. done, nothing more to do) rather than
    // leaving it to retry forever.
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
        await whatsAppProvider.send({ to: phone, text });
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
  const when = event.event_date ? new Date(event.event_date).toLocaleString(locale) : '';
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
