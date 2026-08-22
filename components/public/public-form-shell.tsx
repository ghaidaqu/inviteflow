import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { ArrowLeftIcon } from 'lucide-react';

/**
 * Shared visual shell for the guest-facing form pages that people reach via
 * a direct link (try-it-free, RSVP, its edit page, the questions
 * follow-up) — plain ivory background matching the rest of the site (no
 * blurred color-blob backdrop — that read as a generic "SaaS gradient"
 * effect, out of step with the site's own flat editorial identity), just
 * the icon badge and entrance treatment so these don't feel like a
 * separate, uncared-for step in the flow. A real back-to-home button
 * above the icon — these pages had no way back to the site at all before.
 */
export async function PublicFormShell({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const t = await getTranslations('Common');

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6">
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/" />}
          className="mb-4"
        >
          <ArrowLeftIcon className="size-4 rtl:-scale-x-100" />
          {t('backToHome')}
        </Button>

        <div className="bg-primary/10 text-primary mb-4 flex size-12 items-center justify-center rounded-2xl">
          {icon}
        </div>
        <h1 className="font-display mb-1 text-2xl text-balance">{title}</h1>
        {subtitle && <p className="text-muted-foreground mb-6">{subtitle}</p>}
        {children}
      </div>
    </main>
  );
}
