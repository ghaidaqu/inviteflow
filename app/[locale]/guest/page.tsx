import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { HeartIcon, TicketIcon, ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';

export default async function GuestHubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('GuestHub');
  const ArrowIcon = locale === 'ar' ? ArrowLeftIcon : ArrowRightIcon;

  return (
    <main className="relative flex-1 overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="bg-primary/15 absolute start-[-10%] top-[-10%] size-[28rem] rounded-full blur-3xl" />
        <div className="bg-accent/25 absolute end-[-10%] bottom-[-10%] size-[24rem] rounded-full blur-3xl" />
      </div>

      <div className="mx-auto w-full max-w-3xl px-4 py-12">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('title')}</h1>
          <p className="text-muted-foreground mt-2 max-w-lg text-lg">{t('subtitle')}</p>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 mt-10 grid gap-5 delay-150 duration-700 sm:grid-cols-2">
          <GuestCard
            icon={<HeartIcon className="size-6" />}
            title={t('rsvp.title')}
            description={t('rsvp.description')}
          >
            <Button
              className="group w-full justify-between"
              nativeButton={false}
              render={<Link href="/events/sara-ahmad-wedding" />}
            >
              {t('rsvp.cta')}
              <ArrowIcon className="size-4 transition-transform group-hover:-translate-x-1 rtl:group-hover:translate-x-1" />
            </Button>
          </GuestCard>

          <GuestCard
            icon={<TicketIcon className="size-6" />}
            title={t('tickets.title')}
            description={t('tickets.description')}
          >
            <Button
              variant="outline"
              className="group w-full justify-between"
              nativeButton={false}
              render={<Link href="/events/tech-conference-2026" />}
            >
              {t('tickets.cta')}
              <ArrowIcon className="size-4 transition-transform group-hover:-translate-x-1 rtl:group-hover:translate-x-1" />
            </Button>
          </GuestCard>
        </div>

        <p className="text-muted-foreground mt-8 text-sm">{t('note')}</p>
      </div>
    </main>
  );
}

function GuestCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card hover:border-primary/40 hover:shadow-primary/5 flex flex-col gap-4 rounded-2xl border p-6 transition-all hover:-translate-y-1 hover:shadow-lg">
      <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>
      <div className="mt-auto">{children}</div>
    </div>
  );
}
