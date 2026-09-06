import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { whatsAppProvider } from '@/lib/whatsapp';
import { notifyOrganizerNewRsvp } from '@/lib/email/notify';
import { sendGuestQrWhatsApp } from '@/lib/whatsapp/notify';
import { promoteNextWaitlistedGuest } from '@/lib/services/waitlist.service';

/**
 * Meta WhatsApp Cloud API webhook — one endpoint, two jobs:
 *
 * 1. Inbound messages (`value.messages`) — this is what makes "accept the
 *    invitation from inside WhatsApp" actually work: when a guest taps a
 *    reply button sent via sendInvitationWhatsApp (lib/whatsapp/notify.ts),
 *    Meta POSTs the tap here instead of the guest ever visiting the
 *    website. Also handles the "location" button (replies with the venue's
 *    map link) as its own thing, unrelated to the accept/decline flow.
 *
 * 2. Delivery-status callbacks (`value.statuses`) — sent/delivered/read/
 *    failed for messages this number *sent*. Currently just logged in a
 *    structured shape (see the loop below); no table exists yet to
 *    persist these against a specific guest/invitation, since Meta's
 *    payload only carries its own message id, not the request that
 *    produced it — pairing the two would need the send side
 *    (cloud-api-provider.ts) to persist its own message id at send time
 *    first. Wire that up before building anything that reads this data.
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
 * double-checked against a real button tap (and a real status callback)
 * once connected.
 */

const STATUS_BY_ACTION: Record<string, 'attending' | 'not_attending'> = {
  rsvp_accept: 'attending',
  rsvp_decline: 'not_attending',
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
        // Delivery-status callbacks for messages *this number sent* (sent/
        // delivered/read/failed) — a separate array from `messages` above,
        // which is only ever inbound (a guest's tap or reply). Not
        // persisted anywhere yet — logged in a shape a future
        // whatsapp_message_events-style table can take as-is, once
        // there's an actual reason to keep this history (e.g. an
        // organizer-facing "delivery status" column).
        statuses?: {
          id?: string; // the outbound message's own id (from the earlier send response)
          status?: 'sent' | 'delivered' | 'read' | 'failed';
          recipient_id?: string;
          timestamp?: string;
          errors?: { code?: number; title?: string }[];
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

  const statuses = (body.entry ?? []).flatMap((entry) =>
    (entry.changes ?? []).flatMap((change) => change.value?.statuses ?? []),
  );
  for (const s of statuses) {
    // Structured on purpose (one object per line) so this is a drop-in
    // source once a table exists to write these into — no guest/event
    // link exists here yet since Meta only gives back its own message id,
    // not whatever request this was in response to; that pairing would
    // need the send side to persist its own message id at send time.
    console.log('[whatsapp webhook] status', {
      messageId: s.id,
      status: s.status,
      to: s.recipient_id,
      timestamp: s.timestamp,
      errors: s.errors,
    });
  }

  const messages = (body.entry ?? []).flatMap((entry) =>
    (entry.changes ?? []).flatMap((change) => change.value?.messages ?? []),
  );

  for (const message of messages) {
    const buttonId = message.interactive?.button_reply?.id;
    if (!message.interactive || message.interactive.type !== 'button_reply' || !buttonId) continue;

    const [action, guestId] = buttonId.split(':');

    // The "location" button doesn't touch the RSVP status at all — just
    // looks up the guest's event and replies with the map link, entirely
    // separate from the accept/decline flow below.
    if (action === 'rsvp_location' && guestId && message.from) {
      const { data: guest } = await admin
        .from('guests')
        .select('event_id, events(location_text, location_map_url)')
        .eq('id', guestId)
        .single();
      const event = guest?.events as unknown as {
        location_text: string | null;
        location_map_url: string | null;
      } | null;
      if (event?.location_map_url) {
        const text = event.location_text
          ? `📍 ${event.location_text}\n${event.location_map_url}`
          : `📍 ${event.location_map_url}`;
        try {
          await whatsAppProvider.send({ to: message.from, text });
        } catch (sendError) {
          console.error('[whatsapp webhook] location reply failed', sendError);
        }
      }
      continue;
    }

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
      guest_secure_token: string;
      previous_status: 'attending' | 'not_attending' | null;
    } | null;
    if (!result) continue;

    const confirmText =
      status === 'attending'
        ? 'تم تسجيل ردك: موافق. شكرًا لك!'
        : 'تم تسجيل ردك: اعتذار. شكرًا لإخبارنا.';

    if (message.from) {
      try {
        await whatsAppProvider.send({ to: message.from, text: confirmText });
      } catch (sendError) {
        console.error('[whatsapp webhook] confirmation send failed', sendError);
      }
    }

    const { data: event } = await admin
      .from('events')
      .select('name, slug, primary_locale, is_qr_enabled')
      .eq('id', result.event_id)
      .single();
    if (event) {
      const locale = event.primary_locale === 'en' ? 'en' : 'ar';
      await notifyOrganizerNewRsvp(event.slug, result.guest_name, status);

      // Both guards below only fire on a genuine new transition, not a
      // repeat button tap (Meta can resend delivery, or a guest can tap
      // the same button twice).
      if (status === 'not_attending' && result.previous_status !== 'not_attending') {
        await promoteNextWaitlistedGuest(admin, result.event_id, event.slug, locale);
      }

      if (
        status === 'attending' &&
        result.previous_status !== 'attending' &&
        event.is_qr_enabled &&
        message.from
      ) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
        const editUrl = `${appUrl}/${locale}/rsvp/${result.guest_secure_token}`;
        // A button tap never collects companions (there's no form here) —
        // the pass covers just the guest themself. A companion count added
        // later via the edit link won't reach an already-sent pass either
        // (updateRsvpAction only re-sends the QR on a genuine new
        // attending transition, not on every edit) — a pre-existing
        // limitation, not something this change introduces.
        await sendGuestQrWhatsApp(
          event.name,
          guestId,
          result.guest_name,
          1,
          message.from,
          editUrl,
          locale,
        );
      }
    }
  }

  return NextResponse.json({ ok: true });
}
