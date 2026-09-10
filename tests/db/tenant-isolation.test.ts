// @vitest-environment node
import { describe, expect, it, beforeAll } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createTestDb } from './pglite-harness';

/**
 * The question this answers is the one that matters most before launch:
 * can one organizer reach another organizer's guests?
 *
 * Every dashboard route derives its scope from getCurrentOrganizationId
 * and then getEvent(supabase, organizationId, id), which filters on both
 * id and organization_id. But that is application code — a future refactor
 * could drop the filter. These assert the database refuses regardless,
 * running as the `authenticated` role the way a real Supabase client does.
 */
describe('cross-organization isolation', () => {
  let db: PGlite;
  let victimEvent: string;
  let victimGuest: string;
  let attackerId: string;

  // Wrapped in a transaction on purpose: `set local role` outside one is
  // silently a no-op, which would run these as the table owner and bypass
  // RLS entirely — the query would pass while proving nothing.
  const asAttacker = async (sql: string, params: unknown[] = []) => {
    await db.query('begin;');
    try {
      await db.query(`select set_config('request.jwt.claim.sub', '${attackerId}', true);`);
      await db.query('set local role authenticated;');
      return await db.query(sql, params);
    } finally {
      await db.query('rollback;');
    }
  };

  beforeAll(async () => {
    db = await createTestDb();
    // Supabase grants table privileges to anon/authenticated outside of
    // user migrations and relies on RLS to do the actual gatekeeping. The
    // harness only runs our migrations, so without this the role is denied
    // at the grant layer and the test proves nothing about the policies.
    await db.query(`grant usage on schema public to anon, authenticated;`);
    await db.query(
      `grant select, insert, update, delete on all tables in schema public to anon, authenticated;`,
    );
    const mk = async (email: string, orgSlug: string) => {
      const { rows: u } = await db.query<{ id: string }>(
        `insert into auth.users (email) values ($1) returning id;`,
        [email],
      );
      const { rows: o } = await db.query<{ id: string }>(
        `insert into public.organizations (owner_id, name, slug) values ($1, $2, $2) returning id;`,
        [u[0].id, orgSlug],
      );
      // The owner is added as a member by a trigger on organizations.
      return { userId: u[0].id, orgId: o[0].id };
    };
    const victim = await mk('victim@example.com', 'victim-org');
    const attacker = await mk('attacker@example.com', 'attacker-org');
    attackerId = attacker.userId;

    const { rows: e } = await db.query<{ id: string }>(
      `insert into public.events (organization_id, created_by, slug, name, type, status, visibility)
       values ($1,$2,'victim-event','Victim Event','wedding','published','private') returning id;`,
      [victim.orgId, victim.userId],
    );
    victimEvent = e[0].id;
    const { rows: g } = await db.query<{ id: string }>(
      `insert into public.guests (event_id, name, phone) values ($1,'Victim Guest','+966500000000') returning id;`,
      [victimEvent],
    );
    victimGuest = g[0].id;
    await db.query(
      `insert into public.rsvp_responses (event_id, guest_id, status) values ($1,$2,'attending');`,
      [victimEvent, victimGuest],
    );
  });

  it('will not show another organization the guest list', async () => {
    const { rows } = await asAttacker(`select id from public.guests where event_id = $1;`, [
      victimEvent,
    ]);
    expect(rows).toHaveLength(0);
  });

  it('will not show another organization a guest by their bare id', async () => {
    // The shape several actions take: trust a client-supplied guest id.
    const { rows } = await asAttacker(`select phone from public.guests where id = $1;`, [
      victimGuest,
    ]);
    expect(rows).toHaveLength(0);
  });

  it('will not let another organization delete a guest', async () => {
    const { rows } = await asAttacker(
      `update public.guests set deleted_at = now() where id = $1 returning id;`,
      [victimGuest],
    );
    expect(rows).toHaveLength(0);
  });

  it('will not let another organization read RSVP responses', async () => {
    const { rows } = await asAttacker(
      `select status from public.rsvp_responses where event_id = $1;`,
      [victimEvent],
    );
    expect(rows).toHaveLength(0);
  });

  it('will not let another organization publish or edit the event', async () => {
    const { rows } = await asAttacker(
      `update public.events set status = 'ended' where id = $1 returning id;`,
      [victimEvent],
    );
    expect(rows).toHaveLength(0);
  });

  it('keeps the door-staff token and password hash off the events row entirely', async () => {
    // They used to be columns here, and the earlier version of this test
    // passed only because the event was still private: RLS hid the row, so
    // nobody asked whether the columns were safe on a *public* event. They
    // were not. See 20260910000002.
    const { rows } = await db.query<{ column_name: string }>(
      `select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'events'
          and column_name in ('check_in_token', 'password_hash');`,
    );
    expect(rows).toHaveLength(0);
  });

  it('still hides the guest list, and both secrets, when the event is public', async () => {
    // events_select_public deliberately exposes the event row. It must not
    // drag anything else along with it.
    await db.query(`update public.events set visibility = 'public' where id = $1;`, [victimEvent]);
    const ev = await asAttacker(`select id from public.events where id = $1;`, [victimEvent]);
    expect(ev.rows).toHaveLength(1); // the event itself is public, by design

    const guests = await asAttacker(`select id from public.guests where event_id = $1;`, [
      victimEvent,
    ]);
    expect(guests.rows).toHaveLength(0); // the people are not

    const secrets = await asAttacker(
      `select check_in_token from public.event_secrets where event_id = $1;`,
      [victimEvent],
    );
    expect(secrets.rows).toHaveLength(0); // and neither is the door key
  });

  it('gives every new event a secrets row, so the door link works from the start', async () => {
    const { rows } = await db.query<{ n: string }>(
      `select count(*)::text as n from public.event_secrets where event_id = $1;`,
      [victimEvent],
    );
    expect(rows[0].n).toBe('1');
  });
});
