'use client';

import { useMemo, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  deleteGuestAction,
  addGuestsAction,
  sendGuestInviteAction,
  type AddGuestsActionState,
} from '@/lib/actions/guests';
import { buildCsv } from '@/lib/utils/csv';
import type { GuestWithResponse } from '@/lib/services/guests.service';
import { Trash2Icon, DownloadIcon, MessageCircleIcon, UserPlusIcon } from 'lucide-react';

const STATUS_FILTERS = ['all', 'attending', 'not_attending', 'maybe', 'no_response'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_VARIANT = {
  attending: 'default',
  not_attending: 'destructive',
  maybe: 'secondary',
} as const;

export function GuestsTable({
  eventId,
  eventName,
  guests,
}: {
  eventId: string;
  eventName: string;
  guests: GuestWithResponse[];
}) {
  const t = useTranslations('Guests');
  const tErrors = useTranslations('Guests.errors');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [guestLines, setGuestLines] = useState('');
  const [isAdding, startAdding] = useTransition();
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccessCount, setAddSuccessCount] = useState<number | null>(null);

  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [isInviting, startInviting] = useTransition();
  const [inviteMessage, setInviteMessage] = useState<{ id: string; text: string } | null>(null);

  const filtered = useMemo(() => {
    return guests.filter((guest) => {
      const status = guest.response?.status ?? 'no_response';
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (search) {
        const haystack =
          `${guest.name ?? ''} ${guest.email ?? ''} ${guest.phone ?? ''}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [guests, search, statusFilter]);

  function handleDelete(guestId: string) {
    startTransition(async () => {
      await deleteGuestAction(eventId, guestId);
      setDeletingId(null);
    });
  }

  function handleAddGuests() {
    setAddError(null);
    setAddSuccessCount(null);
    const formData = new FormData();
    formData.set('guestLines', guestLines);

    startAdding(async () => {
      const result: AddGuestsActionState = await addGuestsAction(eventId, {}, formData);
      if (result.error) {
        setAddError(result.error);
      } else {
        setAddSuccessCount(result.addedCount ?? 0);
        setGuestLines('');
      }
    });
  }

  function handleSendInvite(guestId: string) {
    setInvitingId(guestId);
    setInviteMessage(null);
    startInviting(async () => {
      const result = await sendGuestInviteAction(eventId, guestId);
      if (result.ok) {
        setInviteMessage({ id: guestId, text: t('sendInvite.sent') });
      } else if (result.notConfigured) {
        setInviteMessage({ id: guestId, text: t('sendInvite.notConfigured') });
      } else if (result.error === 'noPhone') {
        setInviteMessage({ id: guestId, text: t('sendInvite.noPhone') });
      } else {
        setInviteMessage({ id: guestId, text: t('sendInvite.failed') });
      }
    });
  }

  function handleExportCsv() {
    const headers = [
      t('csv.name'),
      t('csv.phone'),
      t('csv.email'),
      t('csv.status'),
      t('csv.companionsCount'),
      t('csv.companionsNames'),
      t('csv.message'),
      t('csv.respondedAt'),
    ];
    const rows = filtered.map((guest) => [
      guest.name ?? '',
      guest.phone ?? '',
      guest.email ?? '',
      guest.response ? t(`status.${guest.response.status}`) : t('status.no_response'),
      guest.response?.companions_count ?? 0,
      Array.isArray(guest.response?.companions_names)
        ? (guest.response.companions_names as string[]).join('; ')
        : '',
      guest.response?.message ?? '',
      guest.response?.responded_at ? new Date(guest.response.responded_at).toLocaleString() : '',
    ]);
    const csv = buildCsv(headers, rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${eventName}-guests.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-fit">
            <SelectValue>{() => t(`statusFilter.${statusFilter}`)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((status) => (
              <SelectItem key={status} value={status}>
                {t(`statusFilter.${status}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger render={<Button variant="outline" className="ms-auto" />}>
            <UserPlusIcon /> {t('addGuests.trigger')}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('addGuests.title')}</DialogTitle>
              <DialogDescription>{t('addGuests.description')}</DialogDescription>
            </DialogHeader>
            {addError && (
              <Alert variant="destructive">
                <AlertDescription>{tErrors(addError)}</AlertDescription>
              </Alert>
            )}
            {addSuccessCount !== null && (
              <Alert>
                <AlertDescription>
                  {t('addGuests.success', { count: addSuccessCount })}
                </AlertDescription>
              </Alert>
            )}
            <Textarea
              value={guestLines}
              onChange={(e) => setGuestLines(e.target.value)}
              placeholder={t('addGuests.placeholder')}
              rows={6}
            />
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                {t('addGuests.cancel')}
              </DialogClose>
              <Button onClick={handleAddGuests} disabled={isAdding || !guestLines.trim()}>
                {isAdding ? t('addGuests.submitting') : t('addGuests.submit')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button variant="outline" onClick={handleExportCsv}>
          <DownloadIcon /> {t('exportCsv')}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground py-10 text-center">{t('empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-start">
              <tr>
                <th className="p-3 text-start font-medium">{t('csv.name')}</th>
                <th className="p-3 text-start font-medium">{t('csv.status')}</th>
                <th className="p-3 text-start font-medium">{t('csv.companionsCount')}</th>
                <th className="p-3 text-start font-medium">{t('csv.message')}</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((guest) => {
                const status = guest.response?.status;
                return (
                  <tr key={guest.id} className="border-t">
                    <td className="p-3">
                      <div className="font-medium">{guest.name ?? '—'}</div>
                      <div className="text-muted-foreground text-xs">
                        {guest.phone ?? guest.email ?? ''}
                      </div>
                    </td>
                    <td className="p-3">
                      {status ? (
                        <Badge variant={STATUS_VARIANT[status]}>{t(`status.${status}`)}</Badge>
                      ) : (
                        <Badge variant="outline">{t('status.no_response')}</Badge>
                      )}
                    </td>
                    <td className="p-3">{guest.response?.companions_count ?? 0}</td>
                    <td className="text-muted-foreground max-w-xs truncate p-3">
                      {guest.response?.message ?? ''}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        {guest.phone && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title={t('sendInvite.button')}
                            disabled={isInviting && invitingId === guest.id}
                            onClick={() => handleSendInvite(guest.id)}
                          >
                            <MessageCircleIcon />
                          </Button>
                        )}
                        <Dialog
                          open={deletingId === guest.id}
                          onOpenChange={(open) => setDeletingId(open ? guest.id : null)}
                        >
                          <DialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
                            <Trash2Icon />
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
                                onClick={() => handleDelete(guest.id)}
                              >
                                {t('deleteConfirmAction')}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                      {inviteMessage?.id === guest.id && (
                        <p className="text-muted-foreground mt-1 text-end text-xs">
                          {inviteMessage.text}
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
