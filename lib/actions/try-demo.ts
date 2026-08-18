'use server';

import { getLocale } from 'next-intl/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createGuestManually } from '@/lib/services/guests.service';
import { sendInvitationWhatsApp } from '@/lib/whatsapp/notify';
import { normalizePhone } from '@/lib/utils/phone';
import { checkRateLimit } from '@/lib/utils/rate-limit';

export type TryDemoState = { error?: string; token?: string };

/**
 * The public, no-login "see it before you sign up" demo — matching how
 * every competitor's own free-trial actually works (fill in your name +
 * phone, get sent a real invitation on WhatsApp right now). This is
 * deliberately NOT the same thing as /start/invitation: that flow lets
 * someone build and trial-send *their own* event after logging in (capped
 * at 3 sends/account, see lib/actions/quick-start.ts); this one sends a
 * fixed sample invitation to whoever asks, with no account at all — the
 * top-level "جرب مجاناً" nav/hero/pricing buttons point here.
 *
 * All demo requests share one dedicated event (created once, reused after)
 * under the same 'inviteflow-demo' organization the seed data already
 * uses — never mixed with the real "sara-ahmad-wedding" portfolio demo
 * event, so this feature's guest list stays its own thing.
 */

const DEMO_ORG_SLUG = 'inviteflow-demo';
const DEMO_EVENT_SLUG = 'trial-demo';

async function getOrCreateDemoEvent(
  admin: ReturnType<typeof createAdminClient>,
): Promise<{ id: string; slug: string }> {
  const { data: existing } = await admin
    .from('events')
    .select('id, slug')
    .eq('slug', DEMO_EVENT_SLUG)
    .maybeSingle();
  if (existing) return existing;

  const { data: org } = await admin
    .from('organizations')
    .select('id, owner_id')
    .eq('slug', DEMO_ORG_SLUG)
    .single();
  if (!org) throw new Error('demo organization missing — run supabase/seed.sql first');

  const { data: created, error } = await admin
    .from('events')
    .insert({
      organization_id: org.id,
      created_by: org.owner_id,
      slug: DEMO_EVENT_SLUG,
      name: 'زفاف سارة وأحمد',
      type: 'wedding',
      description: 'يسعدنا دعوتكم لحضور حفل زفافنا. — هذي دعوة تجريبية توضح لك شكل التجربة.',
      location_text: 'قاعة الأفراح الكبرى، الرياض',
      primary_locale: 'ar',
      visibility: 'public',
      is_rsvp_enabled: true,
      status: 'published',
    })
    .select('id, slug')
    .single();
  if (error || !created) throw new Error('failed to create demo event');
  return created;
}

export async function sendTryDemoInvitationAction(
  _prevState: TryDemoState,
  formData: FormData,
): Promise<TryDemoState> {
  const name = String(formData.get('name') ?? '').trim();
  const phoneRaw = String(formData.get('phone') ?? '').trim();

  if (!name || name.length > 100) return { error: 'invalidInput' };

  const phone = normalizePhone(phoneRaw);
  if (!phone.ok) return { error: 'phoneInvalid' };

  const admin = createAdminClient();

  // Abuse guard on a feature that sends real WhatsApp messages to anyone
  // who asks, with no login at all — scoped by phone so the same number
  // can't be demo-invited over and over, on top of the IP scoping
  // checkRateLimit already does.
  const withinLimit = await checkRateLimit(admin, {
    action: 'try-demo',
    scope: phone.e164,
    maxHits: 3,
    windowSeconds: 60 * 60 * 24,
  });
  if (!withinLimit) return { error: 'rateLimited' };

  let event: { id: string; slug: string };
  try {
    event = await getOrCreateDemoEvent(admin);
  } catch {
    return { error: 'unknown' };
  }

  let guest;
  try {
    guest = await createGuestManually(admin, event.id, {
      name,
      phone: phone.e164,
      email: null,
    });
  } catch {
    return { error: 'unknown' };
  }

  const locale = (await getLocale()) as 'ar' | 'en';
  // Best-effort: a failed/unconfigured WhatsApp send never blocks the
  // guest from reaching their status page — see sendInvitationWhatsApp's
  // own configured:false path (no WhatsApp Cloud API credentials set in
  // this environment yet).
  await sendInvitationWhatsApp(event.slug, guest.id, name, phone.e164, locale);

  return { token: guest.secure_token };
}
