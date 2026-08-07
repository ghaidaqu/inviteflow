import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthCard } from '@/components/auth/auth-card';
import { RegisterForm } from '@/components/auth/register-form';

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
      <RegisterForm next={next} />
    </AuthCard>
  );
}
