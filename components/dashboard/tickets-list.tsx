'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { buildCsv } from '@/lib/utils/csv';
import type { TicketWithContext } from '@/lib/services/tickets.service';
import { DownloadIcon } from 'lucide-react';

const STATUS_VARIANT = {
  valid: 'default',
  used: 'secondary',
  cancelled: 'destructive',
} as const;

export function TicketsList({
  eventName,
  tickets,
}: {
  eventName: string;
  tickets: TicketWithContext[];
}) {
  const t = useTranslations('Tickets.list');

  const stats = useMemo(
    () => ({
      total: tickets.length,
      used: tickets.filter((tk) => tk.status === 'used').length,
      unused: tickets.filter((tk) => tk.status === 'valid').length,
    }),
    [tickets],
  );

  function handleExportCsv() {
    const headers = [
      t('csv.holderName'),
      t('csv.ticketType'),
      t('csv.status'),
      t('csv.buyerEmail'),
      t('csv.pricePaid'),
      t('csv.createdAt'),
    ];
    const rows = tickets.map((tk) => [
      tk.holder_name,
      tk.ticketTypeName,
      t(`status.${tk.status}`),
      tk.order?.buyer_email ?? '',
      tk.price_paid,
      new Date(tk.created_at).toLocaleString(),
    ]);
    const csv = buildCsv(headers, rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${eventName}-tickets.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label={t('totalTickets')} value={stats.total} />
        <StatCard label={t('usedTickets')} value={stats.used} />
        <StatCard label={t('unusedTickets')} value={stats.unused} />
      </div>

      <Button variant="outline" onClick={handleExportCsv} className="w-fit">
        <DownloadIcon /> {t('exportCsv')}
      </Button>

      {tickets.length === 0 ? (
        <p className="text-muted-foreground py-10 text-center">{t('empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-start font-medium">{t('csv.holderName')}</th>
                <th className="p-3 text-start font-medium">{t('csv.ticketType')}</th>
                <th className="p-3 text-start font-medium">{t('csv.status')}</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((tk) => (
                <tr key={tk.id} className="border-t">
                  <td className="p-3">{tk.holder_name}</td>
                  <td className="text-muted-foreground p-3">{tk.ticketTypeName}</td>
                  <td className="p-3">
                    <Badge variant={STATUS_VARIANT[tk.status]}>{t(`status.${tk.status}`)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card rounded-xl border p-4 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-muted-foreground text-sm">{label}</div>
    </div>
  );
}
