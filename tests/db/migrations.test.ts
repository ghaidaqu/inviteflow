// @vitest-environment node
import { describe, expect, it, beforeAll } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createTestDb, actAs } from './pglite-harness';

describe('database migrations', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createTestDb();
  }, 30_000);

  it('enables row level security with at least one policy on every public table', async () => {
    const tables = await db.query<{ tablename: string; rowsecurity: boolean }>(
      `select tablename, rowsecurity from pg_tables where schemaname = 'public';`,
    );
    expect(tables.rows.length).toBeGreaterThan(10);

    for (const table of tables.rows) {
      expect(table.rowsecurity, `${table.tablename} should have RLS enabled`).toBe(true);
    }

    const policyCounts = await db.query<{ tablename: string; count: string }>(
      `select tablename, count(*) from pg_policies where schemaname = 'public' group by tablename;`,
    );
    const tablesWithPolicies = new Set(policyCounts.rows.map((r) => r.tablename));

    for (const table of tables.rows) {
      expect(
        tablesWithPolicies.has(table.tablename),
        `${table.tablename} should have a policy`,
      ).toBe(true);
    }
  });

  it('creates a profile automatically when an auth user signs up', async () => {
    const { rows } = await db.query<{ id: string }>(
      `insert into auth.users (email) values ('organizer@example.com') returning id;`,
    );
    const userId = rows[0].id;

    const profile = await db.query(`select * from public.profiles where id = '${userId}';`);
    expect(profile.rows).toHaveLength(1);
  });

  it('creates a personal organization (with the user as owner member) on signup', async () => {
    const { rows } = await db.query<{ id: string }>(
      `insert into auth.users (email, raw_user_meta_data) values ('org-signup@example.com', '{"full_name": "Org Signup"}') returning id;`,
    );
    const userId = rows[0].id;

    const org = await db.query<{ id: string; name: string }>(
      `select * from public.organizations where owner_id = '${userId}';`,
    );
    expect(org.rows).toHaveLength(1);
    expect(org.rows[0].name).toBe('Org Signup');

    const membership = await db.query(
      `select role from public.organization_members where organization_id = '${org.rows[0].id}' and user_id = '${userId}';`,
    );
    expect(membership.rows).toEqual([{ role: 'owner' }]);
  });

  it('auto-adds the creator as an owner member when an organization is created', async () => {
    const { rows: userRows } = await db.query<{ id: string }>(
      `insert into auth.users (email) values ('owner2@example.com') returning id;`,
    );
    const userId = userRows[0].id;

    const { rows: orgRows } = await db.query<{ id: string }>(
      `insert into public.organizations (owner_id, name, slug)
       values ('${userId}', 'Test Org', 'test-org-${userId.slice(0, 8)}') returning id;`,
    );
    const orgId = orgRows[0].id;

    const membership = await db.query(
      `select role from public.organization_members where organization_id = '${orgId}' and user_id = '${userId}';`,
    );
    expect(membership.rows).toEqual([{ role: 'owner' }]);
  });

  it('creates default event_settings and event_designs rows for a new event', async () => {
    const { rows: userRows } = await db.query<{ id: string }>(
      `insert into auth.users (email) values ('owner3@example.com') returning id;`,
    );
    const userId = userRows[0].id;
    const { rows: orgRows } = await db.query<{ id: string }>(
      `insert into public.organizations (owner_id, name, slug)
       values ('${userId}', 'Org3', 'org3-${userId.slice(0, 8)}') returning id;`,
    );
    const orgId = orgRows[0].id;

    const { rows: eventRows } = await db.query<{ id: string }>(
      `insert into public.events (organization_id, created_by, slug, name, type, status, visibility, is_rsvp_enabled)
       values ('${orgId}', '${userId}', 'wedding-${userId.slice(0, 8)}', 'Test Wedding', 'wedding', 'published', 'public', true)
       returning id;`,
    );
    const eventId = eventRows[0].id;

    const settings = await db.query(
      `select * from public.event_settings where event_id = '${eventId}';`,
    );
    const designs = await db.query(
      `select * from public.event_designs where event_id = '${eventId}';`,
    );
    expect(settings.rows).toHaveLength(1);
    expect(designs.rows).toHaveLength(1);
  });

  it('submits an RSVP through submit_rsvp and notifies the organizer', async () => {
    const { rows: userRows } = await db.query<{ id: string }>(
      `insert into auth.users (email) values ('owner4@example.com') returning id;`,
    );
    const userId = userRows[0].id;
    const { rows: orgRows } = await db.query<{ id: string }>(
      `insert into public.organizations (owner_id, name, slug)
       values ('${userId}', 'Org4', 'org4-${userId.slice(0, 8)}') returning id;`,
    );
    const orgId = orgRows[0].id;
    const slug = `grad-${userId.slice(0, 8)}`;
    await db.query(
      `insert into public.events (organization_id, created_by, slug, name, type, status, visibility, is_rsvp_enabled)
       values ('${orgId}', '${userId}', '${slug}', 'Test Graduation', 'graduation', 'published', 'public', true);`,
    );

    const result = await db.query<{ guest_id: string; response_id: string; secure_token: string }>(
      `select * from public.submit_rsvp('${slug}', 'Ahmad', null, null, 'attending', 2, '["Sara", "Omar"]'::jsonb, 'Congrats!', null);`,
    );
    expect(result.rows).toHaveLength(1);
    const { secure_token } = result.rows[0];

    const fetched = await db.query<{ get_rsvp_by_token: { response: { status: string } } }>(
      `select get_rsvp_by_token('${secure_token}');`,
    );
    expect(fetched.rows[0].get_rsvp_by_token.response.status).toBe('attending');

    const notifications = await db.query(
      `select * from public.notifications where organization_id = '${orgId}' and type = 'rsvp_new';`,
    );
    expect(notifications.rows).toHaveLength(1);
  });

  it('rejects RSVP submissions after the deadline has passed', async () => {
    const { rows: userRows } = await db.query<{ id: string }>(
      `insert into auth.users (email) values ('owner5@example.com') returning id;`,
    );
    const userId = userRows[0].id;
    const { rows: orgRows } = await db.query<{ id: string }>(
      `insert into public.organizations (owner_id, name, slug)
       values ('${userId}', 'Org5', 'org5-${userId.slice(0, 8)}') returning id;`,
    );
    const orgId = orgRows[0].id;
    const slug = `expired-${userId.slice(0, 8)}`;
    await db.query(
      `insert into public.events (organization_id, created_by, slug, name, type, status, visibility, is_rsvp_enabled, rsvp_deadline)
       values ('${orgId}', '${userId}', '${slug}', 'Expired Event', 'other', 'published', 'public', true, now() - interval '1 day');`,
    );

    await expect(
      db.query(
        `select * from public.submit_rsvp('${slug}', 'Late Guest', null, null, 'attending', 0, '[]'::jsonb, null, null);`,
      ),
    ).rejects.toThrow(/deadline/);
  });

  it('prevents overselling tickets beyond quantity_total', async () => {
    const { rows: userRows } = await db.query<{ id: string }>(
      `insert into auth.users (email) values ('owner6@example.com') returning id;`,
    );
    const userId = userRows[0].id;
    const { rows: orgRows } = await db.query<{ id: string }>(
      `insert into public.organizations (owner_id, name, slug)
       values ('${userId}', 'Org6', 'org6-${userId.slice(0, 8)}') returning id;`,
    );
    const orgId = orgRows[0].id;
    const slug = `conf-${userId.slice(0, 8)}`;
    const { rows: eventRows } = await db.query<{ id: string }>(
      `insert into public.events (organization_id, created_by, slug, name, type, status, visibility, is_ticketing_enabled)
       values ('${orgId}', '${userId}', '${slug}', 'Test Conf', 'conference', 'published', 'public', true)
       returning id;`,
    );
    const eventId = eventRows[0].id;

    const { rows: ticketTypeRows } = await db.query<{ id: string }>(
      `insert into public.ticket_types (event_id, name_ar, price, quantity_total, max_per_order)
       values ('${eventId}', 'General', 100, 1, 5)
       returning id;`,
    );
    const ticketTypeId = ticketTypeRows[0].id;

    const purchase = await db.query<{ purchase_tickets_mock: { order_id: string } }>(
      `select public.purchase_tickets_mock('${slug}', '${ticketTypeId}', 1, 'Buyer One', null, null);`,
    );
    expect(purchase.rows).toHaveLength(1);

    await expect(
      db.query(
        `select public.purchase_tickets_mock('${slug}', '${ticketTypeId}', 1, 'Buyer Two', null, null);`,
      ),
    ).rejects.toThrow(/sold out/);
  });

  it('checks in a valid ticket exactly once via check_in_ticket', async () => {
    const { rows: userRows } = await db.query<{ id: string }>(
      `insert into auth.users (email) values ('owner7@example.com') returning id;`,
    );
    const userId = userRows[0].id;
    const { rows: orgRows } = await db.query<{ id: string }>(
      `insert into public.organizations (owner_id, name, slug)
       values ('${userId}', 'Org7', 'org7-${userId.slice(0, 8)}') returning id;`,
    );
    const orgId = orgRows[0].id;
    const slug = `sports-${userId.slice(0, 8)}`;
    const { rows: eventRows } = await db.query<{ id: string }>(
      `insert into public.events (organization_id, created_by, slug, name, type, status, visibility, is_ticketing_enabled)
       values ('${orgId}', '${userId}', '${slug}', 'Test Sports', 'sports', 'published', 'public', true)
       returning id;`,
    );
    const eventId = eventRows[0].id;
    const { rows: ticketTypeRows } = await db.query<{ id: string }>(
      `insert into public.ticket_types (event_id, name_ar, price, quantity_total, max_per_order)
       values ('${eventId}', 'General', 0, 5, 5)
       returning id;`,
    );
    const ticketTypeId = ticketTypeRows[0].id;

    const purchase = await db.query<{
      purchase_tickets_mock: { tickets: { qr_token: string }[] };
    }>(
      `select public.purchase_tickets_mock('${slug}', '${ticketTypeId}', 1, 'Scanner Test', null, null);`,
    );
    const qrToken = purchase.rows[0].purchase_tickets_mock.tickets[0].qr_token;

    await actAs(db, userId);

    const firstScan = await db.query<{ check_in_ticket: { result: string } }>(
      `select public.check_in_ticket('${qrToken}');`,
    );
    expect(firstScan.rows[0].check_in_ticket.result).toBe('valid');

    const secondScan = await db.query<{ check_in_ticket: { result: string } }>(
      `select public.check_in_ticket('${qrToken}');`,
    );
    expect(secondScan.rows[0].check_in_ticket.result).toBe('already_used');

    const checkInNotification = await db.query(
      `select * from public.notifications where organization_id = '${orgId}' and type = 'ticket_checked_in';`,
    );
    expect(checkInNotification.rows).toHaveLength(1);

    await actAs(db, null);
  });

  it('looks up a ticket publicly by its QR token via get_ticket_by_qr_token', async () => {
    const { rows: userRows } = await db.query<{ id: string }>(
      `insert into auth.users (email) values ('owner8@example.com') returning id;`,
    );
    const userId = userRows[0].id;
    const { rows: orgRows } = await db.query<{ id: string }>(
      `insert into public.organizations (owner_id, name, slug)
       values ('${userId}', 'Org8', 'org8-${userId.slice(0, 8)}') returning id;`,
    );
    const orgId = orgRows[0].id;
    const slug = `workshop-${userId.slice(0, 8)}`;
    const { rows: eventRows } = await db.query<{ id: string }>(
      `insert into public.events (organization_id, created_by, slug, name, type, status, visibility, is_ticketing_enabled)
       values ('${orgId}', '${userId}', '${slug}', 'Test Workshop', 'workshop', 'published', 'public', true)
       returning id;`,
    );
    const eventId = eventRows[0].id;
    const { rows: ticketTypeRows } = await db.query<{ id: string }>(
      `insert into public.ticket_types (event_id, name_ar, price, quantity_total, max_per_order)
       values ('${eventId}', 'General', 0, 5, 5)
       returning id;`,
    );
    const ticketTypeId = ticketTypeRows[0].id;

    const purchase = await db.query<{
      purchase_tickets_mock: { tickets: { qr_token: string }[] };
    }>(
      `select public.purchase_tickets_mock('${slug}', '${ticketTypeId}', 1, 'Public Lookup Test', null, null);`,
    );
    const qrToken = purchase.rows[0].purchase_tickets_mock.tickets[0].qr_token;

    const lookup = await db.query<{
      get_ticket_by_qr_token: { ticket: { holder_name: string; status: string } };
    }>(`select public.get_ticket_by_qr_token('${qrToken}');`);
    expect(lookup.rows[0].get_ticket_by_qr_token.ticket.holder_name).toBe('Public Lookup Test');
    expect(lookup.rows[0].get_ticket_by_qr_token.ticket.status).toBe('valid');
  });
});
