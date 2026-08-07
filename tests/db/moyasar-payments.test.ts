// @vitest-environment node
import { describe, expect, it, beforeAll } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createTestDb } from './pglite-harness';

describe('async payment order flow (create_pending_ticket_order / confirm / fail / status)', () => {
  let db: PGlite;
  let eventSlug: string;
  let ticketTypeId: string;
  let eventIdForTests: string;

  beforeAll(async () => {
    db = await createTestDb();

    const { rows: userRows } = await db.query<{ id: string }>(
      `insert into auth.users (email) values ('moyasar-owner@example.com') returning id;`,
    );
    const userId = userRows[0].id;
    const { rows: orgRows } = await db.query<{ id: string }>(
      `insert into public.organizations (owner_id, name, slug)
       values ('${userId}', 'Moyasar Org', 'moyasar-org-${userId.slice(0, 8)}') returning id;`,
    );
    const orgId = orgRows[0].id;
    eventSlug = `moyasar-event-${userId.slice(0, 8)}`;
    const { rows: eventRows } = await db.query<{ id: string }>(
      `insert into public.events (organization_id, created_by, slug, name, type, status, visibility, is_ticketing_enabled)
       values ('${orgId}', '${userId}', '${eventSlug}', 'Moyasar Test Event', 'other', 'published', 'public', true)
       returning id;`,
    );
    const eventId = eventRows[0].id;
    const { rows: ticketTypeRows } = await db.query<{ id: string }>(
      `insert into public.ticket_types (event_id, name_ar, price, quantity_total, max_per_order)
       values ('${eventId}', 'General', 100, 20, 5)
       returning id;`,
    );
    ticketTypeId = ticketTypeRows[0].id;
    eventIdForTests = eventId;
  }, 30_000);

  it('creates a pending order without creating any ticket rows yet', async () => {
    const { rows } = await db.query<{
      create_pending_ticket_order: { order_id: string; total_amount: string; currency: string };
    }>(
      `select public.create_pending_ticket_order('${eventSlug}', '${ticketTypeId}', 1, 'Buyer One', 'buyer1@example.com', null);`,
    );
    const order = rows[0].create_pending_ticket_order;
    expect(order.order_id).toBeTruthy();
    expect(Number(order.total_amount)).toBe(100);

    const { rows: orderRows } = await db.query<{ payment_status: string }>(
      `select payment_status from public.ticket_orders where id = '${order.order_id}';`,
    );
    expect(orderRows[0].payment_status).toBe('pending');

    const { rows: ticketRows } = await db.query(
      `select * from public.tickets where order_id = '${order.order_id}';`,
    );
    expect(ticketRows).toHaveLength(0);
  });

  it('get_order_status reports pending, then paid with tickets after confirm_ticket_order', async () => {
    const { rows } = await db.query<{
      create_pending_ticket_order: { order_id: string };
    }>(
      `select public.create_pending_ticket_order('${eventSlug}', '${ticketTypeId}', 1, 'Buyer Two', 'buyer2@example.com', null);`,
    );
    const orderId = rows[0].create_pending_ticket_order.order_id;

    const pendingStatus = await db.query<{ get_order_status: { status: string } }>(
      `select public.get_order_status('${orderId}');`,
    );
    expect(pendingStatus.rows[0].get_order_status.status).toBe('pending');

    await db.query(`select public.confirm_ticket_order('${orderId}', 'test-ref-1');`);

    const paidStatus = await db.query<{
      get_order_status: { status: string; tickets: { qr_token: string }[] };
    }>(`select public.get_order_status('${orderId}');`);
    expect(paidStatus.rows[0].get_order_status.status).toBe('paid');
    expect(paidStatus.rows[0].get_order_status.tickets).toHaveLength(1);
  });

  it('confirm_ticket_order is idempotent on retry (webhook redelivery)', async () => {
    const { rows } = await db.query<{
      create_pending_ticket_order: { order_id: string };
    }>(
      `select public.create_pending_ticket_order('${eventSlug}', '${ticketTypeId}', 1, 'Buyer Three', null, null);`,
    );
    const orderId = rows[0].create_pending_ticket_order.order_id;

    const first = await db.query<{ confirm_ticket_order: { tickets: unknown[] } }>(
      `select public.confirm_ticket_order('${orderId}', 'ref-a');`,
    );
    const second = await db.query<{ confirm_ticket_order: { tickets: unknown[] } }>(
      `select public.confirm_ticket_order('${orderId}', 'ref-a-retry');`,
    );
    expect(first.rows[0].confirm_ticket_order.tickets).toHaveLength(1);
    expect(second.rows[0].confirm_ticket_order.tickets).toHaveLength(1);

    const { rows: ticketRows } = await db.query(
      `select * from public.tickets where order_id = '${orderId}';`,
    );
    expect(ticketRows).toHaveLength(1); // not duplicated by the retry
  });

  it('fail_ticket_order marks a pending order failed and blocks a subsequent confirm', async () => {
    const { rows } = await db.query<{
      create_pending_ticket_order: { order_id: string };
    }>(
      `select public.create_pending_ticket_order('${eventSlug}', '${ticketTypeId}', 1, 'Buyer Four', null, null);`,
    );
    const orderId = rows[0].create_pending_ticket_order.order_id;

    await db.query(`select public.fail_ticket_order('${orderId}');`);

    const status = await db.query<{ get_order_status: { status: string } }>(
      `select public.get_order_status('${orderId}');`,
    );
    expect(status.rows[0].get_order_status.status).toBe('failed');

    await expect(
      db.query(`select public.confirm_ticket_order('${orderId}', 'ref-b');`),
    ).rejects.toThrow(/not pending/);
  });

  it('create_pending_ticket_order rejects once the ticket type is sold out', async () => {
    // Dedicated ticket type with a single seat so this test is independent
    // of how much inventory earlier tests in this file have consumed.
    const { rows: soldOutType } = await db.query<{ id: string }>(
      `insert into public.ticket_types (event_id, name_ar, price, quantity_total, max_per_order)
       values ('${eventIdForTests}', 'Sold-out tier', 50, 1, 5)
       returning id;`,
    );
    const soldOutTicketTypeId = soldOutType[0].id;

    const first = await db.query<{ create_pending_ticket_order: { order_id: string } }>(
      `select public.create_pending_ticket_order('${eventSlug}', '${soldOutTicketTypeId}', 1, 'Buyer Five', null, null);`,
    );
    await db.query(
      `select public.confirm_ticket_order('${first.rows[0].create_pending_ticket_order.order_id}', 'ref-c');`,
    );

    await expect(
      db.query(
        `select public.create_pending_ticket_order('${eventSlug}', '${soldOutTicketTypeId}', 1, 'Buyer Six', null, null);`,
      ),
    ).rejects.toThrow(/sold out/);
  });

  it('get_order_status returns not_found for an unknown order id', async () => {
    const status = await db.query<{ get_order_status: { status: string } }>(
      `select public.get_order_status('00000000-0000-0000-0000-000000000000');`,
    );
    expect(status.rows[0].get_order_status.status).toBe('not_found');
  });
});
