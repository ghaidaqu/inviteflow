-- Extensions ------------------------------------------------------------
create extension if not exists pgcrypto;

-- Generic helpers ---------------------------------------------------------

-- Stamps updated_at = now() on every row update. Attached as a BEFORE UPDATE
-- trigger on every table that has an updated_at column.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger function: stamps updated_at = now() on every row update.';
