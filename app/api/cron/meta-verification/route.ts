import * as Sentry from '@sentry/nextjs';
import { NextResponse, type NextRequest } from 'next/server';
import { checkCronAuth } from '@/lib/utils/cron-auth';
import { OTP_TEMPLATE_LANGUAGE, OTP_TEMPLATE_NAME } from '@/lib/whatsapp/send-otp';
import { LOGIN_OTP_TEMPLATE, isPhoneLoginEnabled } from '@/lib/whatsapp/phone-login';

/**
 * A daily look at the one thing phone login is waiting on.
 *
 * Meta will not let this account create an AUTHENTICATION template until
 * the business passes Business Verification (lib/whatsapp/phone-login.ts),
 * and that review has no callback — someone would have to keep checking.
 * This asks Meta once a day and acts on the answer:
 *
 *   pending   submitted and under review. Nothing to do. Meta has separate
 *             states for "waiting on you" (pending_need_more_info,
 *             pending_submission), so plain pending really means wait.
 *   verified  submit login_otp_ar if it isn't there yet, and say so once it
 *             is approved — phone login is then one switch away.
 *   anything  else (need_more_info, rejected, expired, revoked …) a person
 *             has to act. Raised to Sentry, which emails on a new issue;
 *             the text is fixed per state, so the next day's run joins the
 *             same issue instead of sending another email.
 */
const GRAPH_API = 'https://graph.facebook.com/v21.0';

type Template = { name: string; language: string; status: string };

async function graph(path: string, init?: RequestInit) {
  const res = await fetch(`${GRAPH_API}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });
  return { ok: res.ok, body: await res.json().catch(() => ({})) };
}

async function run(request: NextRequest) {
  const auth = checkCronAuth(request, 'meta-verification');
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.reason },
      { status: auth.reason === 'not_configured' ? 500 : 401 },
    );
  }

  const waba = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  if (!waba || !process.env.WHATSAPP_ACCESS_TOKEN) {
    return NextResponse.json({ skipped: 'whatsapp_not_configured' });
  }

  const account = await graph(`${waba}?fields=business_verification_status`);
  const status: string | undefined = account.body.business_verification_status;
  if (!account.ok || !status) {
    console.error('[cron/meta-verification] could not read verification status', account.body);
    return NextResponse.json({ error: 'meta_unreachable' }, { status: 502 });
  }

  if (status === 'pending') return NextResponse.json({ status });

  if (status !== 'verified') {
    Sentry.captureMessage(`Meta Business Verification needs attention: ${status}`, {
      level: 'warning',
      tags: { cron: 'meta-verification' },
    });
    return NextResponse.json({ status });
  }

  const listed = await graph(
    `${waba}/message_templates?name=${OTP_TEMPLATE_NAME}&fields=name,language,status`,
  );
  const template = ((listed.body.data ?? []) as Template[]).find(
    (t) => t.name === OTP_TEMPLATE_NAME && t.language === OTP_TEMPLATE_LANGUAGE,
  );

  if (template) {
    if (template.status === 'APPROVED' && !isPhoneLoginEnabled()) {
      Sentry.captureMessage('login_otp_ar is approved — phone login is ready to switch on', {
        level: 'info',
        tags: { cron: 'meta-verification' },
      });
    }
    return NextResponse.json({ status, template: template.status });
  }

  const created = await graph(`${waba}/message_templates`, {
    method: 'POST',
    body: JSON.stringify(LOGIN_OTP_TEMPLATE),
  });
  if (!created.ok) {
    console.error('[cron/meta-verification] creating login_otp_ar failed', created.body);
    Sentry.captureMessage('Business is verified but creating login_otp_ar failed', {
      level: 'error',
      tags: { cron: 'meta-verification' },
      extra: { response: created.body },
    });
    return NextResponse.json({ status, error: 'template_create_failed' }, { status: 502 });
  }

  Sentry.captureMessage('Business verified — login_otp_ar submitted to Meta for approval', {
    level: 'info',
    tags: { cron: 'meta-verification' },
  });
  return NextResponse.json({ status, template: created.body.status ?? 'PENDING' });
}

export const GET = run;
export const POST = run;
