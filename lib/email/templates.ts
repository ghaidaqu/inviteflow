type Locale = 'ar' | 'en';

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

export function organizerTicketPurchasedEmail(
  locale: Locale,
  params: { eventName: string; buyerName: string; quantity: number },
) {
  if (locale === 'ar') {
    return {
      subject: `عملية شراء جديدة — ${params.eventName}`,
      html: wrap(
        locale,
        `
        <p>تم شراء <strong>${params.quantity}</strong> تذكرة لمناسبة <strong>${params.eventName}</strong>.</p>
        <p>المشتري: ${params.buyerName}</p>
      `,
      ),
    };
  }
  return {
    subject: `New ticket purchase — ${params.eventName}`,
    html: wrap(
      locale,
      `
      <p><strong>${params.quantity}</strong> ticket(s) purchased for <strong>${params.eventName}</strong>.</p>
      <p>Buyer: ${params.buyerName}</p>
    `,
    ),
  };
}

export function buyerTicketsEmail(
  locale: Locale,
  params: { eventName: string; ticketUrls: string[] },
) {
  const links = params.ticketUrls
    .map(
      (url, i) =>
        `<p><a href="${url}">${locale === 'ar' ? 'تذكرة' : 'Ticket'} ${i + 1}: ${url}</a></p>`,
    )
    .join('');

  if (locale === 'ar') {
    return {
      subject: `تذاكرك — ${params.eventName}`,
      html: wrap(
        locale,
        `
        <p>شكرًا لشرائك تذاكر <strong>${params.eventName}</strong>. احتفظ بروابط تذاكرك:</p>
        ${links}
      `,
      ),
    };
  }
  return {
    subject: `Your tickets — ${params.eventName}`,
    html: wrap(
      locale,
      `
      <p>Thanks for buying tickets to <strong>${params.eventName}</strong>. Keep these ticket links:</p>
      ${links}
    `,
    ),
  };
}
