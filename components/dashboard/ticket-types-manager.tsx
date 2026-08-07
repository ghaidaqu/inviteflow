'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { TicketTypeForm } from '@/components/dashboard/ticket-type-form';
import {
  createTicketTypeAction,
  updateTicketTypeAction,
  deleteTicketTypeAction,
} from '@/lib/actions/tickets';
import type { Database } from '@/types/supabase';
import { PlusIcon, PencilIcon, Trash2Icon } from 'lucide-react';

type TicketTypeRow = Database['public']['Tables']['ticket_types']['Row'];

const STATUS_VARIANT = {
  active: 'default',
  paused: 'secondary',
  ended: 'outline',
} as const;

export function TicketTypesManager({
  eventId,
  ticketTypes,
}: {
  eventId: string;
  ticketTypes: TicketTypeRow[];
}) {
  const t = useTranslations('Tickets');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(ticketTypeId: string) {
    startTransition(async () => {
      await deleteTicketTypeAction(eventId, ticketTypeId);
      setDeletingId(null);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogTrigger render={<Button className="w-fit" />}>
          <PlusIcon /> {t('newButton')}
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('form.createTitle')}</DialogTitle>
          </DialogHeader>
          <TicketTypeForm
            action={createTicketTypeAction.bind(null, eventId)}
            onSuccess={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {ticketTypes.length === 0 ? (
        <p className="text-muted-foreground py-10 text-center">{t('empty')}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {ticketTypes.map((tt) => (
            <li key={tt.id} className="bg-card flex flex-col gap-2 rounded-xl border p-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium">{tt.name_ar}</h3>
                <Badge variant={STATUS_VARIANT[tt.status]}>{t(`form.statuses.${tt.status}`)}</Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                {tt.price > 0 ? `${tt.price} ${tt.currency}` : t('free')}
              </p>
              <p className="text-muted-foreground text-sm">
                {t('soldOf', { sold: tt.quantity_sold, total: tt.quantity_total })}
              </p>
              <div className="mt-2 flex gap-2">
                <Dialog
                  open={editingId === tt.id}
                  onOpenChange={(open) => setEditingId(open ? tt.id : null)}
                >
                  <DialogTrigger render={<Button variant="outline" size="sm" />}>
                    <PencilIcon /> {t('editButton')}
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>{t('form.saveChanges')}</DialogTitle>
                    </DialogHeader>
                    <TicketTypeForm
                      ticketType={tt}
                      action={updateTicketTypeAction.bind(null, eventId, tt.id)}
                      onSuccess={() => setEditingId(null)}
                    />
                  </DialogContent>
                </Dialog>

                <Dialog
                  open={deletingId === tt.id}
                  onOpenChange={(open) => setDeletingId(open ? tt.id : null)}
                >
                  <DialogTrigger render={<Button variant="ghost" size="sm" />}>
                    <Trash2Icon /> {t('deleteButton')}
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('deleteConfirmTitle')}</DialogTitle>
                      <DialogDescription>{t('deleteConfirmDescription')}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <DialogClose render={<Button variant="outline" />}>
                        {t('deleteConfirmCancel')}
                      </DialogClose>
                      <Button
                        variant="destructive"
                        disabled={isPending}
                        onClick={() => handleDelete(tt.id)}
                      >
                        {t('deleteConfirmAction')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
