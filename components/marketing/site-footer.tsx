import { getTranslations, getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { BrandMark } from '@/components/brand-mark';

export async function SiteFooter() {
  const t = await getTranslations('HomePage.footer');
  const tj = await getTranslations('HomePage.journeys');
  const tBrand = await getTranslations('Brand');
  const locale = await getLocale();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:grid-cols-3 sm:px-6">
        <div className="flex flex-col gap-3 sm:col-span-1">
          <p className="text-muted-foreground max-w-xs text-sm">{t('tagline')}</p>
          <span className="font-display text-primary flex items-center gap-1.5 text-lg">
            <BrandMark className="size-5" />
            {tBrand('name')}
          </span>
        </div>

        <div>
          <h3 className="text-sm font-bold">{t('journeysHeading')}</h3>
          <ul className="text-muted-foreground mt-3 flex flex-col gap-2 text-sm">
            <li>
              <Link
                href={`/register?next=${encodeURIComponent(`/${locale}/start/invitation`)}`}
                className="hover:text-foreground"
              >
                {tj('invitation.title')}
              </Link>
            </li>
            <li>
              <Link
                href={`/register?next=${encodeURIComponent(`/${locale}/start/rsvp`)}`}
                className="hover:text-foreground"
              >
                {tj('rsvp.title')}
              </Link>
            </li>
            <li>
              {/* Same destination + same new-tab treatment as the
                  "المؤسسات" nav link — it's meant to read as a separate
                  product ("مهلّي أعمال"), not another section of
                  this site. */}
              <Link
                href="/institutional"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground"
              >
                {tj('institutional.title')}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold">{t('accountHeading')}</h3>
          <ul className="text-muted-foreground mt-3 flex flex-col gap-2 text-sm">
            <li>
              <Link href="/login" className="hover:text-foreground">
                {t('loginLink')}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t px-4 py-5 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-muted-foreground text-xs">{t('copyright', { year })}</p>
          <div className="text-muted-foreground flex items-center gap-4 text-xs">
            <Link href="/terms" className="hover:text-foreground hover:underline">
              {t('termsLink')}
            </Link>
            <Link href="/privacy" className="hover:text-foreground hover:underline">
              {t('privacyLink')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
