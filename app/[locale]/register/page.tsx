import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthCard } from '@/components/auth/auth-card';
import { LoginMethods } from '@/components/auth/login-methods';

// "Start free" and "Log in" are the same page in disguise: with OTP auth,
// creating an account and signing in are the same action (enter a phone or
// email, confirm the code — a new account is created automatically if one
// doesn't exist yet). Keeping a separate fullName+password-only form here
// was confusing — it looked like a heavier, different flow than login,
// when functionally it doesn't need to be.
export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  const { next } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations('Auth.register');

  return (
    <AuthCard title={t('title')} subtitle={t('subtitle')}>
      <LoginMethods next={next} />
    </AuthCard>
  );
}
