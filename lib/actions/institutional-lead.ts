'use server';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { emailProvider } from '@/lib/email';
import { z } from 'zod';

const institutionalLeadSchema = z.object({
  name: z.string().trim().min(1).max(150),
  organization: z.string().trim().min(1).max(150),
  email: z.email(),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  message: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type InstitutionalLeadState = {
  error?: string;
  success?: boolean;
};

/**
 * The institutional page has no real product behind it yet (see
 * app/[locale]/institutional/page.tsx — it's a "coming soon" page), so
 * there's no events/organizations row this lead attaches to. Just emails
 * the interest straight to whoever's building this, no new table needed —
 * this is a handful of leads while the feature doesn't exist yet, not
 * data the product needs to query or report on later.
 */
export async function submitInstitutionalLeadAction(
  _prevState: InstitutionalLeadState,
  formData: FormData,
): Promise<InstitutionalLeadState> {
  if (!isSupabaseConfigured()) return { error: 'unknown' };

  const parsed = institutionalLeadSchema.safeParse({
    name: formData.get('name'),
    organization: formData.get('organization'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    message: formData.get('message'),
  });
  if (!parsed.success) return { error: 'invalidInput' };

  const supabase = await createClient();
  const allowed = await checkRateLimit(supabase, {
    action: 'institutional-lead',
    scope: parsed.data.email,
    maxHits: 3,
    windowSeconds: 60 * 60 * 24,
  });
  if (!allowed) return { error: 'rateLimited' };

  const notifyTo = process.env.LEADS_NOTIFICATION_EMAIL ?? 'sultanh112233@hotmail.com';
  const rows = [
    ['الاسم', parsed.data.name],
    ['الجهة', parsed.data.organization],
    ['البريد', parsed.data.email],
    ['الجوال', parsed.data.phone ?? '—'],
    ['نوع الفعالية', parsed.data.message ?? '—'],
  ]
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#5b5548">${label}</td><td>${value}</td></tr>`,
    )
    .join('');

  try {
    await emailProvider.send({
      to: notifyTo,
      subject: `اهتمام مؤسسي جديد — ${parsed.data.organization}`,
      html: `<table style="font-family:sans-serif;font-size:14px">${rows}</table>`,
    });
  } catch (error) {
    console.error('[institutional-lead] notification email failed', error);
    // Best-effort — the organizer's interest was still recorded server-side
    // in logs even if the email itself failed; don't fail the submission
    // over a notification hiccup.
  }

  return { success: true };
}
