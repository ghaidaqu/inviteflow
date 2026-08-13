import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthCard } from '@/components/auth/auth-card';
import { LoginMethods } from '@/components/auth/login-methods';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { locale } = await params;
  const { next, error } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations('Auth.login');
  const tErrors = await getTranslations('Auth.errors');

  return (
    <AuthCard title={t('title')} subtitle={t('subtitle')}>
      {/* /auth/confirm bounces failed email links (expired or already-used
          password-reset / confirmation links) back here with this flag.
          Without surfacing it the user lands on a plain login screen with
          no idea why their link didn't work. */}
      {error === 'auth_confirm_failed' && (
        <Alert variant="destructive">
          <AlertDescription>{tErrors('authConfirmFailed')}</AlertDescription>
        </Alert>
      )}
      <LoginMethods next={next} />
    </AuthCard>
  );
}
