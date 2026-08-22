'use client';

import { useMemo, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { Field, FieldLabel } from '@/components/ui/field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  deleteGuestAction,
  updateGuestAction,
  sendGuestInviteAction,
  type UpdateGuestActionState,
} from '@/lib/actions/guests';
import { buildCsv } from '@/lib/utils/csv';
import { formatPhoneForDisplay } from '@/lib/utils/phone';
import { AddGuestsDialog } from '@/components/dashboard/add-guests-dialog';
import type { GuestWithResponse } from '@/lib/services/guests.service';
import { Trash2Icon, DownloadIcon, MessageCircleIcon, PencilIcon } from 'lucide-react';

// 'waitlisted' filters on the is_waitlisted flag, orthogonal to RSVP
// status (a waitlisted guest normally has no response yet, since they
// haven't been invited — but the filter is independent either way).
const STATUS_FILTERS = ['all', 'attending', 'not_attending', 'no_response', 'waitlisted'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_VARIANT = {
  attending: 'default',
  not_attending: 'destructive',
} as const;

type GuestRowDraft = {
  name: string;
  phone: string;
  expectedCompanions: string;
  isWaitlisted: boolean;
};
const emptyRow: GuestRowDraft = {
  name: '',
  phone: '',
  expectedCompanions: '',
  isWaitlisted: false,
};

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

  const [editingGuest, setEditingGuest] = useState<GuestWithResponse | null>(null);
  const [editDraft, setEditDraft] = useState<GuestRowDraft>(emptyRow);
  const [isEditing, startEditing] = useTransition();
  const [editError, setEditError] = useState<string | null>(null);

  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [isInviting, startInviting] = useTransition();
  const [inviteMessage, setInviteMessage] = useState<{ id: string; text: string } | null>(null);

  const filtered = useMemo(() => {
    return guests.filter((guest) => {
      if (statusFilter === 'waitlisted') {
        if (!guest.is_waitlisted) return false;
      } else {
        const status = guest.response?.status ?? 'no_response';
        if (statusFilter !== 'all' && status !== statusFilter) return false;
      }
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

  function openEdit(guest: GuestWithResponse) {
    setEditError(null);
    setEditDraft({
      name: guest.name ?? '',
      phone: guest.phone ? formatPhoneForDisplay(guest.phone) : '',
      expectedCompanions: String(guest.expected_companions ?? 0),
      isWaitlisted: guest.is_waitlisted,
    });
    setEditingGuest(guest);
  }

  function handleSaveEdit() {
    if (!editingGuest) return;
    if (!editDraft.name.trim()) {
      setEditError('invalidInput');
      return;
    }
    setEditError(null);
    const formData = new FormData();
    formData.set('name', editDraft.name);
    formData.set('phone', editDraft.phone);
    formData.set('expectedCompanions', editDraft.expectedCompanions);
    formData.set('isWaitlisted', editDraft.isWaitlisted ? 'true' : 'false');

    startEditing(async () => {
      const result: UpdateGuestActionState = await updateGuestAction(
        eventId,
        editingGuest.id,
        {},
        formData,
      );
      if (result.error) {
        setEditError(result.error);
      } else {
        setEditingGuest(null);
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
      t('csv.expectedCompanions'),
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
      guest.expected_companions ?? 0,
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
        <AddGuestsDialog
          eventId={eventId}
          existingPhones={guests.map((g) => g.phone ?? '').filter(Boolean)}
        />
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
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{guest.name ?? '—'}</span>
                        {guest.is_waitlisted && (
                          <Badge variant="secondary">{t('waitlist.badge')}</Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground text-xs" dir="ltr">
                        {/* Stored as E.164; Saudi numbers read better locally. */}
                        {guest.phone ? formatPhoneForDisplay(guest.phone) : (guest.email ?? '')}
                      </div>
                    </td>
                    <td className="p-3">
                      {status ? (
                        <Badge variant={STATUS_VARIANT[status]}>{t(`status.${status}`)}</Badge>
                      ) : (
                        <Badge variant="outline">{t('status.no_response')}</Badge>
                      )}
                    </td>
                    <td className="p-3">
                      {guest.response ? (
                        guest.response.companions_count
                      ) : (
                        /* No reply yet, so there is no real number to show —
                           fall back to the organizer's own estimate, muted so
                           it can't be mistaken for a confirmed answer. */
                        <span
                          className="text-muted-foreground"
                          title={t('addGuests.companionsHint')}
                        >
                          {guest.expected_companions ?? 0}
                        </span>
                      )}
                    </td>
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
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title={t('editGuest.trigger')}
                          onClick={() => openEdit(guest)}
                        >
                          <PencilIcon />
                        </Button>
                        <Dialog
                          open={deletingId === guest.id}
                          onOpenChange={(open) => setDeletingId(open ? guest.id : null)}
                        >
                          <DialogTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={t('a11yDeleteGuest')}
                              />
                            }
                          >
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

      <Dialog open={editingGuest !== null} onOpenChange={(open) => !open && setEditingGuest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editGuest.title')}</DialogTitle>
            <DialogDescription>{t('editGuest.description')}</DialogDescription>
          </DialogHeader>
          {editError && (
            <Alert variant="destructive">
              <AlertDescription>{tErrors(editError)}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-3">
            <Field>
              <FieldLabel htmlFor="edit-guest-name">{t('addGuests.nameLabel')}</FieldLabel>
              <Input
                id="edit-guest-name"
                value={editDraft.name}
                onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-guest-phone">{t('addGuests.phoneLabel')}</FieldLabel>
              <PhoneInput
                id="edit-guest-phone"
                value={editDraft.phone}
                onChange={(phone) => setEditDraft((d) => ({ ...d, phone }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-guest-companions">
                {t('addGuests.companionsLabel')}
              </FieldLabel>
              <Input
                id="edit-guest-companions"
                type="number"
                inputMode="numeric"
                min={0}
                value={editDraft.expectedCompanions}
                onChange={(e) =>
                  setEditDraft((d) => ({ ...d, expectedCompanions: e.target.value }))
                }
                dir="ltr"
              />
            </Field>
            <Field orientation="horizontal">
              <FieldLabel htmlFor="edit-guest-waitlisted" className="flex-1 font-normal">
                {t('waitlist.toggleLabel')}
              </FieldLabel>
              <Switch
                id="edit-guest-waitlisted"
                checked={editDraft.isWaitlisted}
                onCheckedChange={(checked) =>
                  setEditDraft((d) => ({ ...d, isWaitlisted: checked }))
                }
              />
            </Field>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{t('addGuests.cancel')}</DialogClose>
            <Button onClick={handleSaveEdit} disabled={isEditing || !editDraft.name.trim()}>
              {isEditing ? t('editGuest.submitting') : t('editGuest.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
