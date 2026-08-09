import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthCard } from '@/components/auth/auth-card';
import { LoginMethods } from '@/components/auth/login-methods';

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  const { next } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations('Auth.login');

  return (
    <AuthCard title={t('title')} subtitle={t('subtitle')}>
      <LoginMethods next={next} />
    </AuthCard>
  );
}
