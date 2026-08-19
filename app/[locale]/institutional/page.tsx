import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PaletteIcon, UsersIcon, BarChart3Icon, HeadsetIcon } from 'lucide-react';
import { SiteNav } from '@/components/marketing/site-nav';
import { SiteFooter } from '@/components/marketing/site-footer';
import { InstitutionalLeadForm } from '@/components/public/institutional-lead-form';

const FEATURE_ICONS = [PaletteIcon, UsersIcon, BarChart3Icon, HeadsetIcon];

/**
 * A dedicated destination for institutional/organization use — separate
 * from the "دعوة مؤسسية" journey card on the homepage, which still goes
 * straight to the dashboard's (minimal, functional) institutional
 * creation flow. This page is the honest picture of where that line is
 * actually headed: not ready yet, here's what's coming, leave your
 * details. No login wall, no product to try — just the pitch + a lead
 * form, so nothing here overpromises.
 */
export default async function InstitutionalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Institutional');

  const features = [1, 2, 3, 4].map((n) => ({
    title: t(`feature${n}Title` as 'feature1Title'),
    desc: t(`feature${n}Desc` as 'feature1Desc'),
    Icon: FEATURE_ICONS[n - 1]!,
  }));

  return (
    <>
      <SiteNav />
      <main className="flex flex-col">
        <section className="relative overflow-hidden py-14 sm:py-20">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 text-center sm:px-6">
            <span className="bg-secondary text-secondary-foreground rounded-full px-4 py-1.5 text-xs font-semibold">
              {t('badge')}
            </span>
            <h1 className="font-display text-3xl leading-[1.2] text-balance sm:text-4xl">
              {t('title')}
            </h1>
            <p className="text-muted-foreground max-w-xl text-lg text-balance">{t('subtitle')}</p>
          </div>
        </section>

        <section className="bg-muted/30 py-14 sm:py-20">
          <div className="mx-auto grid w-full max-w-5xl gap-4 px-4 sm:grid-cols-2 sm:px-6">
            {features.map(({ title, desc, Icon }) => (
              <div key={title} className="bg-card flex items-start gap-4 rounded-2xl border p-5">
                <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                  <Icon className="size-5" />
                </span>
                <div>
                  <h3 className="font-display text-base">{title}</h3>
                  <p className="text-muted-foreground mt-1 text-sm">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="py-14 sm:py-20">
          <div className="mx-auto w-full max-w-xl px-4 sm:px-6">
            <div className="bg-card rounded-2xl border p-6 sm:p-8">
              <h2 className="font-display text-xl">{t('form.title')}</h2>
              <p className="text-muted-foreground mt-1 mb-6 text-sm">{t('form.subtitle')}</p>
              <InstitutionalLeadForm />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
