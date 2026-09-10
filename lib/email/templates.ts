import type { ResultsSummary } from '@/lib/services/results.service';

type Locale = 'ar' | 'en';

const COLORS = {
  canvas: '#f8f3ec',
  card: '#fffdf7',
  ink: '#261914',
  primary: '#6e2a2c',
  secondary: '#6e2a2c',
  muted: '#74655d',
  border: '#dfd2ba',
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function summaryHtml(locale: Locale, summary: ResultsSummary): string {
  const rsvpLines =
    locale === 'ar'
      ? `<p>سيحضر: <strong>${summary.attendingCount}</strong> — لن يحضر: <strong>${summary.notAttendingCount}</strong></p>`
      : `<p>Attending: <strong>${summary.attendingCount}</strong> — Not attending: <strong>${summary.notAttendingCount}</strong></p>`;

  const questionsHtml = summary.questions
    .filter((q) => q.tally)
    .map((q) => {
      const text = escapeHtml(
        locale === 'ar' ? q.questionTextAr : (q.questionTextEn ?? q.questionTextAr),
      );
      const options = q
        .tally!.map(
          (t) => `<li>${escapeHtml(locale === 'ar' ? t.labelAr : t.labelEn)}: ${t.count}</li>`,
        )
        .join('');
      return `<p><strong>${text}</strong></p><ul>${options}</ul>`;
    })
    .join('');

  return rsvpLines + questionsHtml;
}

const RSVP_STATUS_LABEL: Record<Locale, Record<'attending' | 'not_attending', string>> = {
  ar: { attending: 'سيحضر', not_attending: 'لن يحضر' },
  en: { attending: 'Attending', not_attending: 'Not attending' },
};

function wrap(locale: Locale, bodyHtml: string): string {
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  return `<!doctype html>
<html lang="${locale}" dir="${dir}">
  <body style="margin:0;background:${COLORS.canvas};color:${COLORS.ink};font-family:Tahoma,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.canvas};padding:32px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${COLORS.card};border:1px solid ${COLORS.border};border-radius:24px;overflow:hidden;box-shadow:0 14px 40px rgba(38,25,20,.08);">
          <tr><td style="height:6px;background:${COLORS.primary};font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td style="padding:30px 32px 12px;text-align:center;">
            <img src="https://mhalli.co/brand/mhalli-official-symbol-upright.svg" width="28" height="28" alt="مهلّي" style="display:inline-block;width:28px;height:28px;vertical-align:middle;border:0;" />
            <div style="margin-top:14px;color:${COLORS.primary};font-family:Georgia,Tahoma,serif;font-size:25px;font-weight:700;">مهلّي</div>
            <div style="margin-top:5px;color:${COLORS.muted};font-size:12px;letter-spacing:.08em;">${locale === 'ar' ? 'دعوتك تبدأ من هنا' : 'Your invitation starts here'}</div>
          </td></tr>
          <tr><td style="padding:14px 32px 32px;font-size:15px;line-height:1.9;">${bodyHtml}</td></tr>
          <tr><td style="border-top:1px solid ${COLORS.border};padding:18px 32px;text-align:center;color:${COLORS.muted};font-size:11px;">mhalli.co</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function statusCard(label: string): string {
  return `<div style="margin:20px 0;padding:15px 18px;border:1px solid ${COLORS.border};border-inline-start:4px solid ${COLORS.secondary};border-radius:12px;background:#faf6ea;font-size:17px;font-weight:700;">${label}</div>`;
}

function actionButton(locale: Locale, href: string): string {
  const label = locale === 'ar' ? 'تعديل الرد' : 'Edit response';
  return `<p style="margin:24px 0 8px;"><a href="${escapeHtml(href)}" style="display:inline-block;background:${COLORS.secondary};color:#fff;text-decoration:none;border-radius:999px;padding:11px 24px;font-weight:700;">${label}</a></p>`;
}

export function organizerNewRsvpEmail(
  locale: Locale,
  params: { eventName: string; guestName: string; status: 'attending' | 'not_attending' },
) {
  const statusLabel = RSVP_STATUS_LABEL[locale][params.status];
  const eventName = escapeHtml(params.eventName);
  const guestName = escapeHtml(params.guestName);
  if (locale === 'ar') {
    return {
      subject: `رد جديد على مناسبة "${params.eventName}"`,
      html: wrap(
        locale,
        `
        <p style="margin-top:0;">وصلك رد جديد على مناسبة <strong>${eventName}</strong>.</p>
        ${statusCard(`${guestName} — ${statusLabel}`)}
        <p style="color:${COLORS.muted};font-size:13px;">افتح لوحة التحكم لمراجعة كل الردود.</p>
      `,
      ),
    };
  }
  return {
    subject: `New RSVP for "${params.eventName}"`,
    html: wrap(
      locale,
      `
      <p style="margin-top:0;">You have a new RSVP for <strong>${eventName}</strong>.</p>
      ${statusCard(`${guestName} — ${statusLabel}`)}
      <p style="color:${COLORS.muted};font-size:13px;">Open your dashboard to review all responses.</p>
    `,
    ),
  };
}

export function guestRsvpConfirmationEmail(
  locale: Locale,
  params: { eventName: string; editUrl: string },
) {
  const eventName = escapeHtml(params.eventName);
  if (locale === 'ar') {
    return {
      subject: `تم استلام ردك — ${params.eventName}`,
      html: wrap(
        locale,
        `
        <p style="margin-top:0;">شكرًا لك، تم استلام ردك على دعوة <strong>${eventName}</strong> بنجاح.</p>
        <p>احتفظ بهذا الرابط لتعديل ردك لاحقًا إذا احتجت:</p>
        ${actionButton(locale, params.editUrl)}
      `,
      ),
    };
  }
  return {
    subject: `We received your RSVP — ${params.eventName}`,
    html: wrap(
      locale,
      `
      <p style="margin-top:0;">Thanks — your response to <strong>${eventName}</strong> was received.</p>
      <p>Keep this link if you need to edit your response later:</p>
      ${actionButton(locale, params.editUrl)}
    `,
    ),
  };
}

export function resultsBroadcastEmail(
  locale: Locale,
  params: { eventName: string; summary: ResultsSummary },
) {
  const body = summaryHtml(locale, params.summary);
  const eventName = escapeHtml(params.eventName);

  if (locale === 'ar') {
    return {
      subject: `نتيجة الردود — ${params.eventName}`,
      html: wrap(
        locale,
        `
        <p style="margin-top:0;">هذه نتيجة الردود على <strong>${eventName}</strong>:</p>
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
      <p style="margin-top:0;">Here are the results for <strong>${eventName}</strong>:</p>
      ${body}
    `,
    ),
  };
}
