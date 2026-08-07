// @vitest-environment node
import { describe, expect, it, beforeAll } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createTestDb } from './pglite-harness';

describe('check_rate_limit', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createTestDb();
  }, 30_000);

  it('allows requests under the limit and blocks once the limit is hit', async () => {
    const key = 'test:rsvp:1.2.3.4';

    for (let i = 0; i < 3; i++) {
      const { rows } = await db.query<{ check_rate_limit: boolean }>(
        `select check_rate_limit('${key}', 3, 60) as check_rate_limit;`,
      );
      expect(rows[0].check_rate_limit, `hit #${i + 1} should be allowed`).toBe(true);
    }

    const { rows: blocked } = await db.query<{ check_rate_limit: boolean }>(
      `select check_rate_limit('${key}', 3, 60) as check_rate_limit;`,
    );
    expect(blocked[0].check_rate_limit).toBe(false);
  });

  it('keys are independent of each other', async () => {
    const a = await db.query<{ check_rate_limit: boolean }>(
      `select check_rate_limit('test:rsvp:independent-a', 1, 60) as check_rate_limit;`,
    );
    expect(a.rows[0].check_rate_limit).toBe(true);

    const b = await db.query<{ check_rate_limit: boolean }>(
      `select check_rate_limit('test:rsvp:independent-b', 1, 60) as check_rate_limit;`,
    );
    expect(b.rows[0].check_rate_limit).toBe(true);

    const aAgain = await db.query<{ check_rate_limit: boolean }>(
      `select check_rate_limit('test:rsvp:independent-a', 1, 60) as check_rate_limit;`,
    );
    expect(aAgain.rows[0].check_rate_limit).toBe(false);
  });

  it('allows requests again once the window expires', async () => {
    const key = 'test:rsvp:short-window';

    const first = await db.query<{ check_rate_limit: boolean }>(
      `select check_rate_limit('${key}', 1, 1) as check_rate_limit;`,
    );
    expect(first.rows[0].check_rate_limit).toBe(true);

    const blocked = await db.query<{ check_rate_limit: boolean }>(
      `select check_rate_limit('${key}', 1, 1) as check_rate_limit;`,
    );
    expect(blocked.rows[0].check_rate_limit).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 1200));

    const afterWindow = await db.query<{ check_rate_limit: boolean }>(
      `select check_rate_limit('${key}', 1, 1) as check_rate_limit;`,
    );
    expect(afterWindow.rows[0].check_rate_limit).toBe(true);
  });

  it('rate_limit_hits is not directly readable or writable by anon/authenticated', async () => {
    const policies = await db.query<{ tablename: string; count: string }>(
      `select tablename, count(*) from pg_policies where schemaname = 'public' and tablename = 'rate_limit_hits' group by tablename;`,
    );
    expect(policies.rows).toHaveLength(1);

    const rls = await db.query<{ rowsecurity: boolean }>(
      `select rowsecurity from pg_tables where schemaname = 'public' and tablename = 'rate_limit_hits';`,
    );
    expect(rls.rows[0].rowsecurity).toBe(true);
  });
});
