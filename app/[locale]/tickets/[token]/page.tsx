import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getTicketByQrToken } from '@/lib/services/tickets.service';
import { Badge } from '@/components/ui/badge';

const STATUS_VARIANT = {
  valid: 'default',
  used: 'secondary',
  cancelled: 'destructive',
} as const;

export default async function PublicTicketPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  if (!isSupabaseConfigured()) notFound();

  const supabase = await createClient();
  const data = await getTicketByQrToken(supabase, token);
  if (!data) notFound();

  const t = await getTranslations('PublicTickets.ticketPage');
  const ticketTypeName =
    locale === 'ar'
      ? data.ticket_type.name_ar
      : (data.ticket_type.name_en ?? data.ticket_type.name_ar);
  const qrDataUrl = await QRCode.toDataURL(data.ticket.qr_token, { margin: 1 });

  return (
    <main className="mx-auto w-full max-w-md px-4 py-8 sm:px-6">
      <div className="bg-card rounded-xl border p-6 text-center">
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-xl font-bold">{data.event.name}</h1>
          <Badge variant={STATUS_VARIANT[data.ticket.status]}>
            {t(`status.${data.ticket.status}`)}
          </Badge>
        </div>
        <p className="text-muted-foreground mt-1">{ticketTypeName}</p>

        <div className="mt-6 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt={data.ticket.qr_token} width={200} height={200} />
        </div>

        <dl className="mt-6 grid gap-3 text-start">
          <div>
            <dt className="text-muted-foreground text-sm">{t('holderNameLabel')}</dt>
            <dd className="mt-0.5">{data.ticket.holder_name}</dd>
          </div>
          {data.event.event_date && (
            <div>
              <dt className="text-muted-foreground text-sm">{t('dateLabel')}</dt>
              <dd className="mt-0.5">{new Date(data.event.event_date).toLocaleString(locale)}</dd>
            </div>
          )}
          {data.event.location_text && (
            <div>
              <dt className="text-muted-foreground text-sm">{t('locationLabel')}</dt>
              <dd className="mt-0.5">{data.event.location_text}</dd>
            </div>
          )}
        </dl>
      </div>
    </main>
  );
}
