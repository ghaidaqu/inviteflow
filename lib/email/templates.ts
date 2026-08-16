import type { ResultsSummary } from '@/lib/services/results.service';

type Locale = 'ar' | 'en';

function summaryHtml(locale: Locale, summary: ResultsSummary): string {
  const rsvpLines =
    locale === 'ar'
      ? `<p>سيحضر: <strong>${summary.attendingCount}</strong> — لن يحضر: <strong>${summary.notAttendingCount}</strong> — ربما: <strong>${summary.maybeCount}</strong></p>`
      : `<p>Attending: <strong>${summary.attendingCount}</strong> — Not attending: <strong>${summary.notAttendingCount}</strong> — Maybe: <strong>${summary.maybeCount}</strong></p>`;

  const questionsHtml = summary.questions
    .filter((q) => q.tally)
    .map((q) => {
      const text = locale === 'ar' ? q.questionTextAr : (q.questionTextEn ?? q.questionTextAr);
      const options = q
        .tally!.map((t) => `<li>${locale === 'ar' ? t.labelAr : t.labelEn}: ${t.count}</li>`)
        .join('');
      return `<p><strong>${text}</strong></p><ul>${options}</ul>`;
    })
    .join('');

  return rsvpLines + questionsHtml;
}

const RSVP_STATUS_LABEL: Record<Locale, Record<'attending' | 'not_attending' | 'maybe', string>> = {
  ar: { attending: 'سيحضر', not_attending: 'لن يحضر', maybe: 'ربما' },
  en: { attending: 'Attending', not_attending: 'Not attending', maybe: 'Maybe' },
};

function wrap(locale: Locale, bodyHtml: string): string {
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  return `<!doctype html>
<html lang="${locale}" dir="${dir}">
  <body style="font-family: system-ui, sans-serif; background: #f8f8f8; padding: 24px;">
    <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 24px; border: 1px solid #eee;">
      <div style="font-weight: 700; font-size: 18px; margin-bottom: 16px;">InviteFlow</div>
      ${bodyHtml}
    </div>
  </body>
</html>`;
}

export function organizerNewRsvpEmail(
  locale: Locale,
  params: { eventName: string; guestName: string; status: 'attending' | 'not_attending' | 'maybe' },
) {
  const statusLabel = RSVP_STATUS_LABEL[locale][params.status];
  if (locale === 'ar') {
    return {
      subject: `رد جديد على مناسبة "${params.eventName}"`,
      html: wrap(
        locale,
        `
        <p>وصلك رد جديد على مناسبة <strong>${params.eventName}</strong>:</p>
        <p><strong>${params.guestName}</strong> — ${statusLabel}</p>
        <p style="color: #666; font-size: 13px;">افتح لوحة التحكم لمراجعة كل الردود.</p>
      `,
      ),
    };
  }
  return {
    subject: `New RSVP for "${params.eventName}"`,
    html: wrap(
      locale,
      `
      <p>You have a new RSVP for <strong>${params.eventName}</strong>:</p>
      <p><strong>${params.guestName}</strong> — ${statusLabel}</p>
      <p style="color: #666; font-size: 13px;">Open your dashboard to review all responses.</p>
    `,
    ),
  };
}

export function guestRsvpConfirmationEmail(
  locale: Locale,
  params: { eventName: string; editUrl: string },
) {
  if (locale === 'ar') {
    return {
      subject: `تم استلام ردك — ${params.eventName}`,
      html: wrap(
        locale,
        `
        <p>شكرًا لك، تم استلام ردك على دعوة <strong>${params.eventName}</strong> بنجاح.</p>
        <p>احتفظ بهذا الرابط لتعديل ردك لاحقًا إذا احتجت:</p>
        <p><a href="${params.editUrl}">${params.editUrl}</a></p>
      `,
      ),
    };
  }
  return {
    subject: `We received your RSVP — ${params.eventName}`,
    html: wrap(
      locale,
      `
      <p>Thanks — your response to <strong>${params.eventName}</strong> was received.</p>
      <p>Keep this link if you need to edit your response later:</p>
      <p><a href="${params.editUrl}">${params.editUrl}</a></p>
    `,
    ),
  };
}

export function resultsBroadcastEmail(
  locale: Locale,
  params: { eventName: string; summary: ResultsSummary },
) {
  const body = summaryHtml(locale, params.summary);

  if (locale === 'ar') {
    return {
      subject: `نتيجة الردود — ${params.eventName}`,
      html: wrap(
        locale,
        `
        <p>هذي نتيجة الردود على <strong>${params.eventName}</strong>:</p>
        ${body}
      `,
      ),
    };
  }
  return {
    subject: `Response results — ${params.eventName}`,
    html: wrap(
      locale,
      `
      <p>Here are the results for <strong>${params.eventName}</strong>:</p>
      ${body}
    `,
    ),
  };
}
