import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { BrandMark } from '@/components/brand-mark';

/**
 * Shown at the bottom of every guest-facing page (the invitation view,
 * the RSVP form and its thank-you screen) — the only way back to مهلّي's
 * own site for someone who only ever had a guest link or a WhatsApp
 * message, never the homepage itself. Without this, a guest who wants to
 * make their own invitation later has nowhere to go from here.
 */
export async function GuestFooter() {
  const t = await getTranslations('Common');

  return (
    <div className="mt-10 flex flex-col items-center gap-2 text-center">
      <p className="text-muted-foreground text-xs">{t('guestFooterTitle')}</p>
      <Link
        href="/"
        className="font-display text-foreground inline-flex items-center gap-1.5 text-sm hover:opacity-80"
      >
        <BrandMark className="size-4" />
        {t('guestFooterCta')}
      </Link>
    </div>
  );
}
