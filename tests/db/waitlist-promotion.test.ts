// @vitest-environment node
import { describe, expect, it, beforeAll } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createTestDb } from './pglite-harness';

/**
 * The reserve list is the one place where declining a wedding invitation
 * causes an invitation to be sent to someone else. Getting it wrong is
 * visible to real guests, so the two things that decide whether anyone is
 * promoted — the event's switch, and the order of the reserve list — are
 * pinned here rather than trusted to reading the function.
 */
describe('promote_next_waitlisted_guest', () => {
  let db: PGlite;
  let userId: string;
  let orgId: string;

  const newEvent = async (slug: string) => {
    const { rows } = await db.query<{ id: string }>(
      `insert into public.events (organization_id, created_by, slug, name, type)
       values ($1, $2, $3, $3, 'wedding') returning id;`,
      [orgId, userId, slug],
    );
    return rows[0].id;
  };

  const addReserve = async (eventId: string, name: string, phone: string | null) => {
    const { rows } = await db.query<{ id: string }>(
      `insert into public.guests (event_id, name, phone, is_waitlisted)
       values ($1, $2, $3, true) returning id;`,
      [eventId, name, phone],
    );
    return rows[0].id;
  };

  const promote = async (eventId: string) => {
    const { rows } = await db.query<{ guest_id: string; name: string }>(
      `select * from public.promote_next_waitlisted_guest($1);`,
      [eventId],
    );
    return rows;
  };

  beforeAll(async () => {
    db = await createTestDb();
    const { rows: users } = await db.query<{ id: string }>(
      `insert into auth.users (email) values ('reserve-owner@example.com') returning id;`,
    );
    userId = users[0].id;
    const { rows: orgs } = await db.query<{ id: string }>(
      `insert into public.organizations (owner_id, name, slug)
       values ($1, 'Reserve Org', 'reserve-org') returning id;`,
      [userId],
    );
    orgId = orgs[0].id;
  });

  it('promotes the reserve guests in the order they were added', async () => {
    const eventId = await newEvent('reserve-order');
    await addReserve(eventId, 'First In', '966500000101');
    await addReserve(eventId, 'Second In', '966500000102');

    expect((await promote(eventId))[0]?.name).toBe('First In');
    expect((await promote(eventId))[0]?.name).toBe('Second In');
  });

  it('takes a promoted guest off the reserve list, so one decline cannot promote them twice', async () => {
    const eventId = await newEvent('reserve-once');
    await addReserve(eventId, 'Only One', '966500000103');

    expect(await promote(eventId)).toHaveLength(1);
    expect(await promote(eventId)).toHaveLength(0);

    const { rows } = await db.query<{ is_waitlisted: boolean }>(
      `select is_waitlisted from public.guests where event_id = $1;`,
      [eventId],
    );
    expect(rows[0].is_waitlisted).toBe(false);
  });

  it('skips someone with no phone number instead of using up their turn', async () => {
    const eventId = await newEvent('reserve-no-phone');
    await addReserve(eventId, 'No Phone', null);
    await addReserve(eventId, 'Has Phone', '966500000104');

    expect((await promote(eventId))[0]?.name).toBe('Has Phone');

    const { rows } = await db.query<{ is_waitlisted: boolean }>(
      `select is_waitlisted from public.guests where event_id = $1 and name = 'No Phone';`,
      [eventId],
    );
    // Still waiting, not silently consumed — a number can be added later.
    expect(rows[0].is_waitlisted).toBe(true);
  });

  it('promotes nobody when the organizer turned automatic replacement off', async () => {
    const eventId = await newEvent('reserve-switch-off');
    await addReserve(eventId, 'Should Stay', '966500000105');
    await db.query(
      `update public.event_settings set auto_replace_declines = false where event_id = $1;`,
      [eventId],
    );

    expect(await promote(eventId)).toHaveLength(0);

    const { rows } = await db.query<{ is_waitlisted: boolean }>(
      `select is_waitlisted from public.guests where event_id = $1;`,
      [eventId],
    );
    expect(rows[0].is_waitlisted).toBe(true);
  });

  it('is on by default, so an event nobody configured behaves as it always did', async () => {
    const eventId = await newEvent('reserve-default-on');
    const { rows } = await db.query<{ auto_replace_declines: boolean }>(
      `select auto_replace_declines from public.event_settings where event_id = $1;`,
      [eventId],
    );
    expect(rows[0].auto_replace_declines).toBe(true);
  });

  it('leaves guest_limit unset, so events made before it existed stay uncapped', async () => {
    const eventId = await newEvent('reserve-no-limit');
    const { rows } = await db.query<{ guest_limit: number | null }>(
      `select guest_limit from public.events where id = $1;`,
      [eventId],
    );
    expect(rows[0].guest_limit).toBeNull();
  });

  it('rejects a guest limit of zero — an event nobody can be invited to', async () => {
    const eventId = await newEvent('reserve-zero-limit');
    await expect(
      db.query(`update public.events set guest_limit = 0 where id = $1;`, [eventId]),
    ).rejects.toThrow();
  });
});
