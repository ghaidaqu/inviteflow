// @vitest-environment node
import { describe, expect, it, beforeAll } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createTestDb } from './pglite-harness';

describe('respond_via_whatsapp (accept/decline entirely inside WhatsApp)', () => {
  let db: PGlite;
  let eventSlug: string;
  let guestId: string;

  beforeAll(async () => {
    db = await createTestDb();

    const { rows: userRows } = await db.query<{ id: string }>(
      `insert into auth.users (email) values ('whatsapp-owner@example.com') returning id;`,
    );
    const userId = userRows[0].id;
    const { rows: orgRows } = await db.query<{ id: string }>(
      `insert into public.organizations (owner_id, name, slug)
       values ('${userId}', 'WhatsApp Org', 'whatsapp-org-${userId.slice(0, 8)}') returning id;`,
    );
    const orgId = orgRows[0].id;
    eventSlug = `whatsapp-event-${userId.slice(0, 8)}`;
    const { rows: eventRows } = await db.query<{ id: string }>(
      `insert into public.events (organization_id, created_by, slug, name, type, status, visibility, is_rsvp_enabled)
       values ('${orgId}', '${userId}', '${eventSlug}', 'WhatsApp Test Event', 'wedding', 'published', 'public', true)
       returning id;`,
    );
    const eventId = eventRows[0].id;
    const { rows: guestRows } = await db.query<{ id: string }>(
      `insert into public.guests (event_id, name, phone) values ('${eventId}', 'Button Tapper', '966500000000') returning id;`,
    );
    guestId = guestRows[0].id;
  }, 30_000);

  it('creates an rsvp_response the first time a button is tapped', async () => {
    const { rows } = await db.query<{
      respond_via_whatsapp: { response_id: string; guest_name: string };
    }>(`select public.respond_via_whatsapp('${guestId}', 'attending');`);
    expect(rows[0].respond_via_whatsapp.response_id).toBeTruthy();
    expect(rows[0].respond_via_whatsapp.guest_name).toBe('Button Tapper');

    const { rows: responseRows } = await db.query<{ status: string }>(
      `select status from public.rsvp_responses where guest_id = '${guestId}';`,
    );
    expect(responseRows).toHaveLength(1);
    expect(responseRows[0].status).toBe('attending');
  });

  it('updates the same response (not a duplicate row) if the guest taps a different button later', async () => {
    await db.query(`select public.respond_via_whatsapp('${guestId}', 'not_attending');`);

    const { rows } = await db.query<{ status: string }>(
      `select status from public.rsvp_responses where guest_id = '${guestId}';`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('not_attending');
  });

  it('rejects an unknown guest id', async () => {
    await expect(
      db.query(
        `select public.respond_via_whatsapp('00000000-0000-0000-0000-000000000000', 'attending');`,
      ),
    ).rejects.toThrow(/guest not found/);
  });

  it('rejects when RSVP is disabled for the event', async () => {
    const { rows: userRows } = await db.query<{ id: string }>(
      `insert into auth.users (email) values ('whatsapp-owner-2@example.com') returning id;`,
    );
    const userId = userRows[0].id;
    const { rows: orgRows } = await db.query<{ id: string }>(
      `insert into public.organizations (owner_id, name, slug)
       values ('${userId}', 'No RSVP Org', 'no-rsvp-org-${userId.slice(0, 8)}') returning id;`,
    );
    const orgId = orgRows[0].id;
    const slug = `announcement-only-${userId.slice(0, 8)}`;
    const { rows: eventRows } = await db.query<{ id: string }>(
      `insert into public.events (organization_id, created_by, slug, name, type, status, visibility, is_rsvp_enabled)
       values ('${orgId}', '${userId}', '${slug}', 'Announcement Only', 'other', 'published', 'public', false)
       returning id;`,
    );
    const eventId = eventRows[0].id;
    const { rows: guestRows } = await db.query<{ id: string }>(
      `insert into public.guests (event_id, name, phone) values ('${eventId}', 'No Response Needed', '966500000001') returning id;`,
    );
    const noRsvpGuestId = guestRows[0].id;

    await expect(
      db.query(`select public.respond_via_whatsapp('${noRsvpGuestId}', 'attending');`),
    ).rejects.toThrow(/rsvp is not open/);
  });
});
