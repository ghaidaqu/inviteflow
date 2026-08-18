import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { whatsAppProvider } from '@/lib/whatsapp';
import { notifyOrganizerNewRsvp } from '@/lib/email/notify';
import { promoteNextWaitlistedGuest } from '@/lib/services/waitlist.service';

/**
 * Meta WhatsApp Cloud API webhook — this is what makes "accept the
 * invitation from inside WhatsApp" actually work: when a guest taps a
 * reply button we sent (see sendInvitationWhatsApp in lib/whatsapp/notify.ts),
 * Meta POSTs the tap here instead of the guest ever visiting the website.
 *
 * Configure in Meta for Developers → your app → WhatsApp → Configuration:
 *   Callback URL: https://<your-domain>/api/webhooks/whatsapp
 *   Verify token: must match WHATSAPP_VERIFY_TOKEN (you choose this value)
 * And under App Settings → Basic, copy the App Secret into
 * WHATSAPP_APP_SECRET (used to verify the X-Hub-Signature-256 header so
 * random POSTs to this URL can't forge RSVP responses).
 *
 * ⚠️ Like the Moyasar webhook, this hasn't been exercised against a live
 * WhatsApp Business account (this environment doesn't have one) — the
 * payload shape follows Meta's published webhook docs but should be
 * double-checked against a real button tap once connected.
 */

const STATUS_BY_ACTION: Record<string, 'attending' | 'not_attending' | 'maybe'> = {
  rsvp_accept: 'attending',
  rsvp_decline: 'not_attending',
  rsvp_maybe: 'maybe',
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!verifyToken) {
    console.error('[whatsapp webhook] WHATSAPP_VERIFY_TOKEN is not set — rejecting');
    return NextResponse.json({ error: 'not configured' }, { status: 500 });
  }

  if (mode === 'subscribe' && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: 'verification failed' }, { status: 403 });
}

function isValidSignature(rawBody: string, signatureHeader: string | null, appSecret: string) {
  if (!signatureHeader?.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const provided = signatureHeader.slice('sha256='.length);
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

type WhatsAppWebhookBody = {
  entry?: {
    changes?: {
      value?: {
        messages?: {
          from?: string;
          interactive?: {
            type?: string;
            button_reply?: { id?: string; title?: string };
          };
        }[];
      };
    }[];
  }[];
};

export async function POST(request: NextRequest) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    console.error('[whatsapp webhook] WHATSAPP_APP_SECRET is not set — rejecting');
    return NextResponse.json({ error: 'not configured' }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('x-hub-signature-256');
  if (!isValidSignature(rawBody, signature, appSecret)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  let body: WhatsAppWebhookBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const admin = createAdminClient();

  const messages = (body.entry ?? []).flatMap((entry) =>
    (entry.changes ?? []).flatMap((change) => change.value?.messages ?? []),
  );

  for (const message of messages) {
    const buttonId = message.interactive?.button_reply?.id;
    if (!message.interactive || message.interactive.type !== 'button_reply' || !buttonId) continue;

    const [action, guestId] = buttonId.split(':');
    const status = action ? STATUS_BY_ACTION[action] : undefined;
    if (!status || !guestId) {
      console.error('[whatsapp webhook] unrecognized button id', buttonId);
      continue;
    }

    const { data, error } = await admin.rpc('respond_via_whatsapp', {
      p_guest_id: guestId,
      p_status: status,
    });

    if (error) {
      console.error('[whatsapp webhook] respond_via_whatsapp failed', error);
      continue;
    }

    const result = data as unknown as {
      guest_name: string;
      event_id: string;
      previous_status: 'attending' | 'not_attending' | 'maybe' | null;
    } | null;
    if (!result) continue;

    const confirmText =
      status === 'attending'
        ? 'تم تسجيل ردك: موافق. شكرًا لك!'
        : status === 'not_attending'
          ? 'تم تسجيل ردك: اعتذار. شكرًا لإخبارنا.'
          : 'تم تسجيل ردك: ربما. شكرًا لك!';

    if (message.from) {
      try {
        await whatsAppProvider.send({ to: message.from, text: confirmText });
      } catch (sendError) {
        console.error('[whatsapp webhook] confirmation send failed', sendError);
      }
    }

    const { data: event } = await admin
      .from('events')
      .select('slug, primary_locale')
      .eq('id', result.event_id)
      .single();
    if (event) {
      await notifyOrganizerNewRsvp(event.slug, result.guest_name, status);

      // Only promote on a genuine new decline, not a repeat button tap
      // (Meta can resend delivery, or a guest can tap Decline twice).
      if (status === 'not_attending' && result.previous_status !== 'not_attending') {
        const locale = event.primary_locale === 'en' ? 'en' : 'ar';
        await promoteNextWaitlistedGuest(admin, result.event_id, event.slug, locale);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
