// @vitest-environment node
import { describe, expect, it, beforeAll } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createTestDb } from './pglite-harness';

describe('results summary aggregation (custom_answers tally)', () => {
  let db: PGlite;
  let eventId: string;
  let yesNoQuestionId: string;
  let choiceQuestionId: string;
  let optionAId: string;
  let optionBId: string;

  beforeAll(async () => {
    db = await createTestDb();

    const { rows: userRows } = await db.query<{ id: string }>(
      `insert into auth.users (email) values ('results-owner@example.com') returning id;`,
    );
    const userId = userRows[0].id;
    const { rows: orgRows } = await db.query<{ id: string }>(
      `insert into public.organizations (owner_id, name, slug)
       values ('${userId}', 'Results Org', 'results-org-${userId.slice(0, 8)}') returning id;`,
    );
    const orgId = orgRows[0].id;
    const slug = `results-event-${userId.slice(0, 8)}`;
    const { rows: eventRows } = await db.query<{ id: string }>(
      `insert into public.events (organization_id, created_by, slug, name, type, status, visibility, is_rsvp_enabled)
       values ('${orgId}', '${userId}', '${slug}', 'Results Test', 'other', 'published', 'public', true)
       returning id;`,
    );
    eventId = eventRows[0].id;

    const { rows: q1 } = await db.query<{ id: string }>(
      `insert into public.custom_questions (event_id, question_text_ar, type, display_order)
       values ('${eventId}', 'حضور فردي؟', 'yes_no', 0) returning id;`,
    );
    yesNoQuestionId = q1[0].id;

    const { rows: q2 } = await db.query<{ id: string }>(
      `insert into public.custom_questions (event_id, question_text_ar, type, display_order)
       values ('${eventId}', 'الأكل المفضل؟', 'single_choice', 1) returning id;`,
    );
    choiceQuestionId = q2[0].id;

    const { rows: opts } = await db.query<{ id: string }>(
      `insert into public.custom_question_options (question_id, option_text_ar, display_order)
       values ('${choiceQuestionId}', 'دجاج', 0), ('${choiceQuestionId}', 'لحم', 1)
       returning id;`,
    );
    optionAId = opts[0].id;
    optionBId = opts[1].id;

    // Three guests: attending+yes+chicken, attending+no+meat, not_attending+yes+chicken.
    for (const [name, status, yes, optionId] of [
      ['Guest A', 'attending', true, optionAId],
      ['Guest B', 'attending', false, optionBId],
      ['Guest C', 'not_attending', true, optionAId],
    ] as const) {
      const { rows: guestRows } = await db.query<{ id: string }>(
        `insert into public.guests (event_id, name) values ('${eventId}', '${name}') returning id;`,
      );
      const guestId = guestRows[0].id;
      const { rows: responseRows } = await db.query<{ id: string }>(
        `insert into public.rsvp_responses (event_id, guest_id, status) values ('${eventId}', '${guestId}', '${status}') returning id;`,
      );
      const responseId = responseRows[0].id;
      await db.query(
        `insert into public.custom_answers (response_id, question_id, answer_value)
         values ('${responseId}', '${yesNoQuestionId}', '${yes}'::jsonb);`,
      );
      await db.query(
        `insert into public.custom_answers (response_id, question_id, answer_value)
         values ('${responseId}', '${choiceQuestionId}', '"${optionId}"'::jsonb);`,
      );
    }
  }, 30_000);

  it('tallies RSVP status counts correctly', async () => {
    const { rows } = await db.query<{ status: string }>(
      `select status from public.rsvp_responses where event_id = '${eventId}';`,
    );
    const attending = rows.filter((r) => r.status === 'attending').length;
    const notAttending = rows.filter((r) => r.status === 'not_attending').length;
    expect(attending).toBe(2);
    expect(notAttending).toBe(1);
  });

  it('tallies yes_no answers correctly', async () => {
    const { rows } = await db.query<{ answer_value: boolean }>(
      `select answer_value from public.custom_answers where question_id = '${yesNoQuestionId}';`,
    );
    const yes = rows.filter((r) => r.answer_value === true).length;
    const no = rows.filter((r) => r.answer_value === false).length;
    expect(yes).toBe(2);
    expect(no).toBe(1);
  });

  it('tallies single_choice answers per option correctly', async () => {
    const { rows } = await db.query<{ answer_value: string }>(
      `select answer_value from public.custom_answers where question_id = '${choiceQuestionId}';`,
    );
    const chicken = rows.filter((r) => r.answer_value === optionAId).length;
    const meat = rows.filter((r) => r.answer_value === optionBId).length;
    expect(chicken).toBe(2);
    expect(meat).toBe(1);
  });
});
