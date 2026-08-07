'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/env';

export function LiveCheckInStats({
  eventId,
  initialTotal,
  initialUsed,
}: {
  eventId: string;
  initialTotal: number;
  initialUsed: number;
}) {
  const t = useTranslations('CheckIn');
  const [total, setTotal] = useState(initialTotal);
  const [used, setUsed] = useState(initialUsed);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`tickets-checkin-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets', filter: `event_id=eq.${eventId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTotal((prev) => prev + 1);
          } else if (payload.eventType === 'UPDATE') {
            const oldStatus = (payload.old as { status?: string }).status;
            const newStatus = (payload.new as { status?: string }).status;
            if (oldStatus !== 'used' && newStatus === 'used') {
              setUsed((prev) => prev + 1);
            } else if (oldStatus === 'used' && newStatus !== 'used') {
              setUsed((prev) => Math.max(prev - 1, 0));
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-card rounded-xl border p-4 text-center">
        <div className="text-2xl font-bold">{used}</div>
        <div className="text-muted-foreground text-sm">{t('checkedIn')}</div>
      </div>
      <div className="bg-card rounded-xl border p-4 text-center">
        <div className="text-2xl font-bold">{total}</div>
        <div className="text-muted-foreground text-sm">{t('totalTickets')}</div>
      </div>
    </div>
  );
}
