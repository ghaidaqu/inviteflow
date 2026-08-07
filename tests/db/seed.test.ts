// @vitest-environment node
import { describe, expect, it, beforeAll } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createTestDb } from './pglite-harness';

const SEED_PATH = path.resolve(import.meta.dirname, '../../supabase/seed.sql');

describe('seed data', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createTestDb();
    const seedSql = readFileSync(SEED_PATH, 'utf-8');
    await db.exec(seedSql);
  }, 30_000);

  it('creates the demo organizer and organization', async () => {
    const org = await db.query(
      `select * from public.organizations where slug = 'inviteflow-demo';`,
    );
    expect(org.rows).toHaveLength(1);
  });

  it('creates the demo published events with guests and tickets', async () => {
    const wedding = await db.query(
      `select * from public.events where slug = 'sara-ahmad-wedding' and status = 'published';`,
    );
    expect(wedding.rows).toHaveLength(1);

    const guests = await db.query(
      `select * from public.guests where event_id = '${(wedding.rows[0] as { id: string }).id}';`,
    );
    expect(guests.rows.length).toBeGreaterThanOrEqual(2);

    const conference = await db.query(
      `select * from public.events where slug = 'tech-conference-2026';`,
    );
    expect(conference.rows).toHaveLength(1);

    const tickets = await db.query(
      `select * from public.tickets where event_id = '${(conference.rows[0] as { id: string }).id}';`,
    );
    expect(tickets.rows).toHaveLength(2);

    const draft = await db.query(
      `select * from public.events where slug = 'graduation-2026-draft' and status = 'draft';`,
    );
    expect(draft.rows).toHaveLength(1);
  });

  it('is idempotent when run twice', async () => {
    const seedSql = readFileSync(SEED_PATH, 'utf-8');
    await expect(db.exec(seedSql)).resolves.not.toThrow();

    const orgs = await db.query(
      `select * from public.organizations where slug = 'inviteflow-demo';`,
    );
    expect(orgs.rows).toHaveLength(1);
  });
});
