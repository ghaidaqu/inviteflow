import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

type OrderStatus = {
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'not_found';
  tickets: { qr_token: string }[];
};

export default async function TicketPurchaseSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ order?: string }>;
}) {
  const { locale, slug } = await params;
  const { order } = await searchParams;
  setRequestLocale(locale);

  if (!isSupabaseConfigured() || !order) notFound();

  const t = await getTranslations('PublicTickets.successPage');
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_order_status', { p_order_id: order });
  if (error) notFound();

  const result = data as unknown as OrderStatus;
  if (result.status === 'not_found') notFound();

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6">
      <div className="bg-card rounded-xl border p-6 text-center">
        {result.status === 'paid' && (
          <>
            <h1 className="text-xl font-bold">{t('paidTitle')}</h1>
            <p className="text-muted-foreground mt-2">{t('paidDescription')}</p>
            <ul className="mt-4 flex flex-col gap-2">
              {result.tickets.map((ticket, i) => (
                <li key={ticket.qr_token}>
                  <Button
                    variant="outline"
                    className="w-full"
                    nativeButton={false}
                    render={<Link href={`/tickets/${ticket.qr_token}`} />}
                  >
                    {t('viewTicket', { number: i + 1 })}
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}

        {result.status === 'pending' && (
          <>
            <h1 className="text-xl font-bold">{t('pendingTitle')}</h1>
            <p className="text-muted-foreground mt-2">{t('pendingDescription')}</p>
          </>
        )}

        {(result.status === 'failed' || result.status === 'refunded') && (
          <Alert variant="destructive">
            <AlertDescription>{t('failedDescription')}</AlertDescription>
          </Alert>
        )}

        <Button
          variant="ghost"
          className="mt-6 w-full"
          nativeButton={false}
          render={<Link href={`/events/${slug}`} />}
        >
          {t('backToEvent')}
        </Button>
      </div>
    </main>
  );
}
