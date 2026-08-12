'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
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
import { Field, FieldLabel } from '@/components/ui/field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  deleteGuestAction,
  addGuestsAction,
  updateGuestAction,
  sendGuestInviteAction,
  type AddGuestsActionState,
  type UpdateGuestActionState,
} from '@/lib/actions/guests';
import { buildCsv } from '@/lib/utils/csv';
import { parseGuestListText } from '@/lib/utils/guest-list';
import { Textarea } from '@/components/ui/textarea';
import type { GuestWithResponse } from '@/lib/services/guests.service';
import {
  Trash2Icon,
  DownloadIcon,
  MessageCircleIcon,
  UserPlusIcon,
  PencilIcon,
  PlusIcon,
  XIcon,
  ContactRoundIcon,
  ClipboardPasteIcon,
} from 'lucide-react';

// The Contact Picker API (Android Chrome only — no iOS Safari, no desktop)
// lets the organizer pick straight from their phone's contacts instead of
// typing every guest by hand. Feature-detected and only rendered where the
// browser actually supports it, so everyone else just sees the plain rows.
type ContactsManager = {
  select: (
    props: string[],
    opts?: { multiple?: boolean },
  ) => Promise<Array<{ name?: string[]; tel?: string[] }>>;
};

function getContactsManager(): ContactsManager | null {
  if (typeof navigator === 'undefined') return null;
  const nav = navigator as Navigator & { contacts?: ContactsManager };
  return nav.contacts ?? null;
}

const STATUS_FILTERS = ['all', 'attending', 'not_attending', 'maybe', 'no_response'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_VARIANT = {
  attending: 'default',
  not_attending: 'destructive',
  maybe: 'secondary',
} as const;

type GuestRowDraft = { name: string; phone: string };
const emptyRow: GuestRowDraft = { name: '', phone: '' };

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
  const [rows, setRows] = useState<GuestRowDraft[]>([emptyRow]);
  const [isAdding, startAdding] = useTransition();
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccessCount, setAddSuccessCount] = useState<number | null>(null);
  const [contactsSupported, setContactsSupported] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');

  useEffect(() => {
    setContactsSupported(getContactsManager() !== null);
  }, []);

  async function handleImportContacts() {
    const contacts = getContactsManager();
    if (!contacts) return;
    try {
      const picked = await contacts.select(['name', 'tel'], { multiple: true });
      if (picked.length === 0) return;
      const imported = picked.map((c) => ({
        name: c.name?.[0]?.trim() ?? '',
        phone: c.tel?.[0]?.trim() ?? '',
      }));
      setRows((prev) => {
        const withoutBlankTrailing = prev.filter((r) => r.name.trim() || r.phone.trim());
        return [...withoutBlankTrailing, ...imported];
      });
    } catch {
      // User cancelled the picker, or the browser denied it — nothing to do.
    }
  }

  // Typing a hundred+ guests one row at a time isn't realistic — this lets
  // the organizer paste a whole list at once (from Excel/Sheets, Notes, or
  // a WhatsApp forward: one guest per line, name and number in any order
  // or separator) and have it turn into editable rows they can still fix
  // up before submitting.
  function handleParsePaste() {
    const parsed = parseGuestListText(pasteText);
    if (parsed.length === 0) return;
    setRows((prev) => {
      const withoutBlankTrailing = prev.filter((r) => r.name.trim() || r.phone.trim());
      return [...withoutBlankTrailing, ...parsed];
    });
    setPasteText('');
    setPasteOpen(false);
  }

  const [editingGuest, setEditingGuest] = useState<GuestWithResponse | null>(null);
  const [editDraft, setEditDraft] = useState<GuestRowDraft>(emptyRow);
  const [isEditing, startEditing] = useTransition();
  const [editError, setEditError] = useState<string | null>(null);

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

  function updateRow(index: number, patch: Partial<GuestRowDraft>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeRow(index: number) {
    setRows((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  function handleAddGuests() {
    setAddError(null);
    setAddSuccessCount(null);
    const cleanRows = rows.filter((r) => r.name.trim().length > 0);
    if (cleanRows.length === 0) {
      setAddError('invalidInput');
      return;
    }
    const formData = new FormData();
    formData.set('guestRows', JSON.stringify(cleanRows));

    startAdding(async () => {
      const result: AddGuestsActionState = await addGuestsAction(eventId, {}, formData);
      if (result.error) {
        setAddError(result.error);
      } else {
        setAddSuccessCount(result.addedCount ?? 0);
        setRows([emptyRow]);
      }
    });
  }

  function openEdit(guest: GuestWithResponse) {
    setEditError(null);
    setEditDraft({ name: guest.name ?? '', phone: guest.phone ?? '' });
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
        <Dialog
          open={addOpen}
          onOpenChange={(open) => {
            setAddOpen(open);
            if (open) {
              setAddError(null);
              setAddSuccessCount(null);
            } else {
              setPasteOpen(false);
              setPasteText('');
            }
          }}
        >
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
            <div className="flex flex-col gap-3">
              {rows.map((row, index) => (
                <div key={index} className="flex items-end gap-2">
                  <Field className="flex-1">
                    <FieldLabel htmlFor={`guest-name-${index}`}>
                      {t('addGuests.nameLabel')}
                    </FieldLabel>
                    <Input
                      id={`guest-name-${index}`}
                      value={row.name}
                      onChange={(e) => updateRow(index, { name: e.target.value })}
                      placeholder={t('addGuests.namePlaceholder')}
                    />
                  </Field>
                  <Field className="flex-1">
                    <FieldLabel htmlFor={`guest-phone-${index}`}>
                      {t('addGuests.phoneLabel')}
                    </FieldLabel>
                    <Input
                      id={`guest-phone-${index}`}
                      value={row.phone}
                      onChange={(e) => updateRow(index, { phone: e.target.value })}
                      placeholder={t('addGuests.phonePlaceholder')}
                      dir="ltr"
                    />
                  </Field>
                  {rows.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeRow(index)}
                      aria-label={t('addGuests.removeRow')}
                    >
                      <XIcon />
                    </Button>
                  )}
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() => setRows((prev) => [...prev, emptyRow])}
                >
                  <PlusIcon /> {t('addGuests.addRow')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() => setPasteOpen((v) => !v)}
                >
                  <ClipboardPasteIcon /> {t('addGuests.pasteList')}
                </Button>
                {contactsSupported && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    onClick={handleImportContacts}
                  >
                    <ContactRoundIcon /> {t('addGuests.importContacts')}
                  </Button>
                )}
              </div>

              {pasteOpen && (
                <div className="bg-muted/30 flex flex-col gap-2 rounded-lg border p-3">
                  <Textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder={t('addGuests.pasteListPlaceholder')}
                    dir="auto"
                    rows={5}
                  />
                  <p className="text-muted-foreground text-xs">{t('addGuests.pasteListHint')}</p>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPasteOpen(false);
                        setPasteText('');
                      }}
                    >
                      {t('addGuests.cancel')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!pasteText.trim()}
                      onClick={handleParsePaste}
                    >
                      {t('addGuests.pasteListSubmit')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                {t('addGuests.cancel')}
              </DialogClose>
              <Button
                onClick={handleAddGuests}
                disabled={isAdding || !rows.some((r) => r.name.trim())}
              >
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
              <Input
                id="edit-guest-phone"
                value={editDraft.phone}
                onChange={(e) => setEditDraft((d) => ({ ...d, phone: e.target.value }))}
                dir="ltr"
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
