// @vitest-environment node
import { describe, expect, it, beforeAll } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createTestDb } from './pglite-harness';

describe('whatsapp_deliveries', () => {
  let db: PGlite;
  let eventId: string;
  let guestId: string;

  beforeAll(async () => {
    db = await createTestDb();

    const { rows: users } = await db.query<{ id: string }>(
      `insert into auth.users (email) values ('delivery-owner@example.com') returning id;`,
    );
    const userId = users[0].id;
    const { rows: orgs } = await db.query<{ id: string }>(
      `insert into public.organizations (owner_id, name, slug)
       values ($1, 'Delivery Org', 'delivery-org') returning id;`,
      [userId],
    );
    const { rows: events } = await db.query<{ id: string }>(
      `insert into public.events (organization_id, created_by, slug, name, type)
       values ($1, $2, 'delivery-event', 'Delivery Event', 'wedding') returning id;`,
      [orgs[0].id, userId],
    );
    eventId = events[0].id;
    const { rows: guests } = await db.query<{ id: string }>(
      `insert into public.guests (event_id, name, phone)
       values ($1, 'Guest One', '966500000001') returning id;`,
      [eventId],
    );
    guestId = guests[0].id;
  });

  it('defaults a new send to accepted', async () => {
    await db.query(
      `insert into public.whatsapp_deliveries (message_id, event_id, guest_id, kind)
       values ('wamid.one', $1, $2, 'invitation');`,
      [eventId, guestId],
    );
    const { rows } = await db.query<{ status: string }>(
      `select status from public.whatsapp_deliveries where message_id = 'wamid.one';`,
    );
    expect(rows[0].status).toBe('accepted');
  });

  it('rejects a status value Meta would never send', async () => {
    await expect(
      db.query(
        `insert into public.whatsapp_deliveries (message_id, event_id, kind, status)
         values ('wamid.bogus', $1, 'invitation', 'exploded');`,
        [eventId],
      ),
    ).rejects.toThrow();
  });

  it('keeps one row per message id, so Meta retrying a webhook cannot duplicate it', async () => {
    await expect(
      db.query(
        `insert into public.whatsapp_deliveries (message_id, event_id, kind)
         values ('wamid.one', $1, 'invitation');`,
        [eventId],
      ),
    ).rejects.toThrow();
  });

  it('records a failure with Meta’s own reason', async () => {
    await db.query(
      `update public.whatsapp_deliveries
         set status = 'failed', error_code = 131026, error_detail = 'Message undeliverable'
       where message_id = 'wamid.one';`,
    );
    const { rows } = await db.query<{
      status: string;
      error_code: number;
      error_detail: string;
    }>(`select status, error_code, error_detail from public.whatsapp_deliveries
        where message_id = 'wamid.one';`);
    expect(rows[0]).toMatchObject({
      status: 'failed',
      error_code: 131026,
      error_detail: 'Message undeliverable',
    });
  });

  it('allows a send that belongs to no particular guest', async () => {
    await db.query(
      `insert into public.whatsapp_deliveries (message_id, event_id, kind)
       values ('wamid.broadcast', $1, 'results');`,
      [eventId],
    );
    const { rows } = await db.query<{ guest_id: string | null }>(
      `select guest_id from public.whatsapp_deliveries where message_id = 'wamid.broadcast';`,
    );
    expect(rows[0].guest_id).toBeNull();
  });

  it('drops a guest’s deliveries when the guest is deleted', async () => {
    await db.query(`delete from public.guests where id = $1;`, [guestId]);
    const { rows } = await db.query<{ count: string }>(
      `select count(*)::text as count from public.whatsapp_deliveries
       where message_id = 'wamid.one';`,
    );
    expect(rows[0].count).toBe('0');
  });
});
