import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getPublicEventBySlug } from '@/lib/services/events.service';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { MailIcon, ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';

// The slug seeded by supabase/seed.sql.
const DEMO_SLUG = 'sara-ahmad-wedding';

/**
 * "Try it as a guest" used to land here on a page whose only job was to show
 * one card linking onward — an extra click between wanting to see the demo
 * and seeing it. Now this route resolves the demo invitation and sends the
 * visitor straight there.
 *
 * It stays a real page rather than pointing the CTAs at the invitation URL
 * directly, because the demo only exists once the database has been seeded.
 * When it isn't there, this renders an explanation instead of the bare 404 a
 * hardcoded link would produce.
 */
export default async function GuestHubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const demo = await getPublicEventBySlug(supabase, DEMO_SLUG).catch(() => null);
    if (demo) {
      redirect({ href: `/events/${DEMO_SLUG}`, locale });
    }
  }

  const t = await getTranslations('GuestHub');
  const ArrowIcon = locale === 'ar' ? ArrowLeftIcon : ArrowRightIcon;

  return (
    <main className="relative flex-1 overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="bg-primary/15 absolute start-[-10%] top-[-10%] size-[28rem] rounded-full blur-3xl" />
        <div className="bg-accent/25 absolute end-[-10%] bottom-[-10%] size-[24rem] rounded-full blur-3xl" />
      </div>

      <div className="mx-auto w-full max-w-2xl px-4 py-12">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('title')}</h1>
          <p className="text-muted-foreground mt-2 max-w-lg text-lg">{t('unavailable')}</p>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 bg-card mt-8 flex flex-col gap-4 rounded-2xl border p-6 delay-150 duration-700 sm:flex-row sm:items-center">
          <div className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-full">
            <MailIcon className="size-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold">{t('rsvp.title')}</h2>
            <p className="text-muted-foreground mt-1 text-sm">{t('unavailableHint')}</p>
          </div>
          <Button
            className="group w-full justify-between sm:w-fit"
            nativeButton={false}
            render={<Link href="/" />}
          >
            {t('backHome')}
            <ArrowIcon className="size-4 transition-transform group-hover:-translate-x-1 rtl:group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </main>
  );
}
