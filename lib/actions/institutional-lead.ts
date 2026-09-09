'use server';

import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { emailProvider } from '@/lib/email';
import { z } from 'zod';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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
 * The institutional page has no product behind it yet (see
 * app/[locale]/institutional/page.tsx — a "coming soon" page), so there is
 * no events/organizations row a lead attaches to.
 *
 * It used to only send an email, on the argument that a table was overkill
 * for a handful of leads. That was wrong for a reason unrelated to volume:
 * RESEND_API_KEY isn't set in production, so emailProvider is the console
 * provider, and every enquiry went to a log line and was lost while the
 * visitor was told we'd be in touch. The row is written first and the
 * email is best-effort on top of it.
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

  const allowed = await checkRateLimit({
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
      // Escaped: every value here is typed by whoever filled in the public
      // form, and it was being interpolated straight into HTML we then
      // email ourselves.
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#5b5548">${label}</td><td>${escapeHtml(String(value))}</td></tr>`,
    )
    .join('');

  // Stored BEFORE the email, and independently of it: a promise to follow
  // up has to survive a missing mail provider.
  const admin = createAdminClient();
  const { data: lead, error: insertError } = await admin
    .from('institutional_leads')
    .insert({
      name: parsed.data.name,
      organization: parsed.data.organization,
      email: parsed.data.email,
      phone: parsed.data.phone ?? null,
      message: parsed.data.message ?? null,
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('[institutional-lead] could not record lead', insertError);
    return { error: 'unknown' };
  }

  try {
    await emailProvider.send({
      to: notifyTo,
      subject: `اهتمام مؤسسي جديد — ${parsed.data.organization}`,
      html: `<table style="font-family:sans-serif;font-size:14px">${rows}</table>`,
    });
    await admin.from('institutional_leads').update({ notified: true }).eq('id', lead.id);
  } catch (error) {
    console.error('[institutional-lead] notification email failed', error);
    // Best-effort — the organizer's interest was still recorded server-side
    // in logs even if the email itself failed; don't fail the submission
    // over a notification hiccup.
  }

  return { success: true };
}
