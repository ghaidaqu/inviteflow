# مهلّي — working notes for anyone (or any agent) touching this repo

Arabic-first invitation delivery. The customer uploads their own
invitation; we deliver it on WhatsApp, collect the replies, and organize
the door. **We do not design invitations** — copy that implies otherwise
is a bug, and has been one twice.

Live at https://mhalli.co. Next.js 15 App Router · next-intl (ar/en) ·
Tailwind v4 · Supabase · Meta WhatsApp Cloud API · deployed on Railway.

## Things that have actually bitten us

**`railway up` deploys your local working tree, including untracked
files — not the git remote.** This once shipped an unfinished payments
feature whose migration was never applied, which made `event.is_paid`
undefined and turned every organizer's Publish button into a 500. If a
feature is being held back, keep it _out of the working tree_, not merely
uncommitted. The held payments work lives in `~/mahalli-held-payments`.

**Every date must be formatted through `lib/utils/format-date.ts`.**
`toLocaleString(locale)` with no `timeZone` uses the _server's_ zone, and
the server runs UTC — so every Saudi event rendered three hours early, on
the public page, in the dashboard, and inside the WhatsApp reminder.
Tests pin this and pass under any host timezone.

**A first WhatsApp message must be an approved template.** Meta rejects
free-form messages to anyone who hasn't messaged the business number in
the last 24 hours (error `131047`). An invitation is by definition a
first message, so it always needs the template — see
`WHATSAPP_INVITE_TEMPLATE` in `.env.example`. This hid for a long time
because the owner's own number always worked: their window was open.
A template's buttons are fixed at approval time, so payloads are indexed
by the _template's_ positions, never by our conditional button array.

**`revoke all on function … from public` does nothing on Supabase.**
Supabase grants EXECUTE to `anon`/`authenticated` explicitly, and
Postgres grants to `PUBLIC` by default. Revoke from all three. Anything
server-only must also be _called_ with the admin client, or revoking it
breaks the caller — that is why rate limiting and waitlist promotion run
as the service role.

**RLS is row-level, not column-level.** `events` has a policy letting
anyone read a published, public event — it has to, or a guest could not
open their invitation. That made `select=*` with the anon key hand out
the whole row, including `check_in_token` (the door-staff secret, which
grants marking guests arrived) and `password_hash`. Both now live in
`event_secrets`, which denies every client role; reach them through
`lib/services/event-secrets.service.ts`. **Anything secret must not share
a table with anything public.** Revoking column privileges is the wrong
fix — it breaks every `select('*')`, and a missed column becomes
`undefined` at runtime instead of an error.

Worth re-running after any schema change, with the anon key:

```bash
curl -s "$SUPABASE_URL/rest/v1/<table>?select=*&limit=1" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
```

Everything with a person in it should come back `[]`. As of 2026-09-10
only `events`, `event_settings`, `event_designs`, `custom_questions`,
`custom_question_options` and `ticket_types` are readable, and only for
the six public, published events.

**The palette is `oklab()` with alpha.** Off-the-shelf contrast checkers
misread it (they parse the 0.87 lightness as a red channel) and ignore
what it composites onto. Use `npm run audit:design`, which converts
properly and composites the full ancestor stack.

## Before you push

```bash
npx tsc --noEmit && npx eslint . && npm run test && npm run build
npm run audit:design            # contrast, rhythm, type scale, overflow
```

`npx eslint . --quiet` hides warnings that still fail `next build`. Run
the build itself before deploying; it has caught things the other three
did not.

## Migrations

Written in `supabase/migrations/`, applied by hand through the Supabase
SQL editor (there is no `supabase db push` in this setup). Typing into
that editor corrupts indentation — set the content with
`window.monaco.editor.getModels()[0].setValue(sql)` instead. Test the
migration first against real Postgres: `tests/db/` runs them in PGlite.

For an RLS test to mean anything it must run as the `authenticated` role
_inside a transaction_ (`set local role` outside one is silently a no-op)
_and_ with Supabase's table grants applied — otherwise it fails at the
grant layer and proves nothing about the policies. See
`tests/db/tenant-isolation.test.ts`.

## Conventions

- Arabic UI copy is formal MSA, short, and never dialect.
- Comments explain _why_, especially where the obvious approach was wrong.
- A deliberately unused binding is prefixed `_`.
