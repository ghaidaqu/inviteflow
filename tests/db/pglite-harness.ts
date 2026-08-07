import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const MIGRATIONS_DIR = path.resolve(import.meta.dirname, '../../supabase/migrations');

// Minimal stand-in for the parts of Supabase's platform schema that our
// migrations assume already exist (auth.users, auth.uid(), the anon/
// authenticated roles). Supabase creates these outside of user migrations,
// so we recreate just enough of them here to run our own migrations against
// a real Postgres engine (via PGlite/WASM) without needing Docker.
const AUTH_STUB_SQL = `
  create schema if not exists auth;

  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    instance_id uuid,
    aud text,
    role text,
    email text,
    encrypted_password text,
    email_confirmed_at timestamptz,
    raw_app_meta_data jsonb not null default '{}'::jsonb,
    raw_user_meta_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  create or replace function auth.uid() returns uuid
  language sql stable
  as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;

  create role anon;
  create role authenticated;
`;

export async function createTestDb() {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(AUTH_STUB_SQL);

  const migrationFiles = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
    try {
      await db.exec(sql);
    } catch (error) {
      throw new Error(`Migration failed: ${file}\n${(error as Error).message}`);
    }
  }

  return db;
}

/** Simulates an authenticated request by setting the JWT `sub` claim auth.uid() reads. */
export async function actAs(db: PGlite, userId: string | null) {
  await db.exec(
    userId
      ? `select set_config('request.jwt.claim.sub', '${userId}', false);`
      : `select set_config('request.jwt.claim.sub', '', false);`,
  );
}
