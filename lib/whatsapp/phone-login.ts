import 'server-only';

/**
 * Whether signing in with a phone number is live.
 *
 * A code typed into the login page reaches the person only when all of
 * this holds outside the codebase:
 *
 *   1. Meta has APPROVED the AUTHENTICATION template `login_otp_ar` that
 *      send-otp.ts sends. Creating it needs the business to have passed
 *      Meta's Business Verification — before that the Graph API answers
 *      "does not have permission to create message template" (subcode
 *      2388185, and the WABA's health_status carries error 141010). The
 *      request, once Meta allows it:
 *        POST /{WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates
 *        { name: "login_otp_ar", language: "ar", category: "AUTHENTICATION",
 *          components: [
 *            { type: "BODY", add_security_recommendation: true },
 *            { type: "BUTTONS", buttons: [
 *                { type: "OTP", otp_type: "COPY_CODE", text: "نسخ الرمز" } ] } ] }
 *   2. Supabase → Authentication → Sign In / Providers: Phone enabled.
 *   3. Supabase → Authentication → Hooks: a Send SMS hook over HTTPS to
 *      https://mhalli.co/api/auth/send-sms-hook, its generated secret in
 *      SEND_SMS_HOOK_SECRET on the server.
 *
 * Without them Supabase answers "Unsupported phone provider" — and phone
 * was the login page's default tab, so the first thing most people did
 * was fail and get told to try email. The secret is the only part visible
 * from here, so the rest is an explicit switch: PHONE_LOGIN_ENABLED=true,
 * set once 1–3 are done, then confirmed by signing in with a real number.
 * Until both are present the phone option is not rendered at all, and the
 * request action refuses before it reaches Supabase.
 */
export function isPhoneLoginEnabled(): boolean {
  return process.env.PHONE_LOGIN_ENABLED === 'true' && Boolean(process.env.SEND_SMS_HOOK_SECRET);
}
