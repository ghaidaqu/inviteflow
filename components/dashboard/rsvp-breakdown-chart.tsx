'use client';

import { useTranslations } from 'next-intl';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function RsvpBreakdownChart({
  attending,
  notAttending,
  noResponse,
}: {
  attending: number;
  notAttending: number;
  noResponse: number;
}) {
  const t = useTranslations('Dashboard.overview');

  const data = [
    { name: t('attending'), value: attending, fill: 'var(--color-chart-1)' },
    { name: t('notAttending'), value: notAttending, fill: 'var(--color-chart-2)' },
    { name: t('noResponse'), value: noResponse, fill: 'var(--color-chart-4)' },
  ];

  return (
    <div className="bg-card h-64 w-full rounded-xl border p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-popover)',
              borderColor: 'var(--color-border)',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
