// @vitest-environment node
import { describe, expect, it, beforeAll } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createTestDb } from './pglite-harness';

describe('canonical_phone', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await createTestDb();
  });

  const canon = async (input: string | null) => {
    const { rows } = await db.query<{ c: string | null }>(
      'select public.canonical_phone($1) as c;',
      [input],
    );
    return rows[0].c;
  };

  it('folds every way a Saudi mobile gets written into one form', async () => {
    for (const written of [
      '+966511111111',
      '00966511111111',
      '966511111111',
      '0511111111',
      '511111111',
      ' +966 51 111 1111 ',
      '+966-51-111-1111',
    ]) {
      expect(await canon(written), `for ${written}`).toBe('+966511111111');
    }
  });

  it('leaves a non-Saudi number as its own digits', async () => {
    expect(await canon('+14155550123')).toBe('+14155550123');
    expect(await canon('+201234567890')).toBe('+201234567890');
  });

  it('treats empty and whitespace as no number at all', async () => {
    expect(await canon(null)).toBeNull();
    expect(await canon('')).toBeNull();
    expect(await canon('   ')).toBeNull();
  });

  it('does not confuse two different people', async () => {
    expect(await canon('0511111111')).not.toBe(await canon('0511111112'));
  });
});

describe('submit_rsvp duplicate guard, across spellings', () => {
  let db: PGlite;
  let slug: string;

  beforeAll(async () => {
    db = await createTestDb();
    const { rows: u } = await db.query<{ id: string }>(
      `insert into auth.users (email) values ('phone-guard@example.com') returning id;`,
    );
    const { rows: o } = await db.query<{ id: string }>(
      `insert into public.organizations (owner_id, name, slug)
       values ($1, 'Phone Org', 'phone-org') returning id;`,
      [u[0].id],
    );
    slug = 'phone-guard-event';
    const { rows: e } = await db.query<{ id: string }>(
      `insert into public.events (organization_id, created_by, slug, name, type, status, visibility)
       values ($1, $2, $3, 'Phone Guard', 'wedding', 'published', 'public') returning id;`,
      [o[0].id, u[0].id, slug],
    );
  });

  const submit = (name: string, phone: string) =>
    db.query(`select public.submit_rsvp($1, $2, $3, null, 'attending', 0, null, 'ar', null);`, [
      slug,
      name,
      phone,
    ]);

  it('accepts the first response', async () => {
    await expect(submit('First', '+966522222222')).resolves.toBeDefined();
  });

  it('rejects the same person written a different way', async () => {
    // This is the case that used to slip through: same human, four spellings.
    for (const rewritten of ['0522222222', '00966522222222', '966522222222', '522222222']) {
      await expect(submit('Impostor', rewritten), `for ${rewritten}`).rejects.toThrow();
    }
  });

  it('still accepts a genuinely different number', async () => {
    await expect(submit('Second', '0533333333')).resolves.toBeDefined();
  });
});
