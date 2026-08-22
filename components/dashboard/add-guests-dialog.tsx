'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { FieldLabel } from '@/components/ui/field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { addGuestsAction, type AddGuestsActionState } from '@/lib/actions/guests';
import {
  reviewGuestRows,
  reviewPastedText,
  summarize,
  parseVCard,
  parseGuestCsv,
  type ReviewedGuest,
} from '@/lib/utils/guest-import';
import { formatPhoneForDisplay } from '@/lib/utils/phone';
import {
  UserPlusIcon,
  ContactRoundIcon,
  FileUpIcon,
  ArrowLeftIcon,
  Trash2Icon,
} from 'lucide-react';

// Android Chrome only — no iOS Safari, no desktop. Feature-detected at
// runtime and simply not rendered elsewhere, so nothing here can break a
// build or throw on an iPhone.
type ContactsManager = {
  select: (
    props: string[],
    opts?: { multiple?: boolean },
  ) => Promise<Array<{ name?: string[]; tel?: string[] }>>;
};

function getContactsManager(): ContactsManager | null {
  if (typeof navigator === 'undefined') return null;
  const nav = navigator as Navigator & { contacts?: ContactsManager };
  const manager = nav.contacts;
  // `ContactsManager.select` is the only method we use; older/partial
  // implementations expose the object without it.
  return manager && typeof manager.select === 'function' ? manager : null;
}

type Stage = 'input' | 'review';

export function AddGuestsDialog({
  eventId,
  existingPhones,
}: {
  eventId: string;
  existingPhones: string[];
}) {
  const t = useTranslations('Guests.addGuests');
  const tErrors = useTranslations('Guests.errors');
  const tGuests = useTranslations('Guests');

  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>('input');
  const [pasteText, setPasteText] = useState('');
  const [singleName, setSingleName] = useState('');
  const [singlePhone, setSinglePhone] = useState('');
  const [singleCompanions, setSingleCompanions] = useState('0');
  const [rows, setRows] = useState<ReviewedGuest[]>([]);
  // Applies to the whole batch, not per-row — "add this list as a reserve
  // list" rather than picking waitlisted people out of a mixed import. A
  // guest can still be moved individually afterward from the guest table.
  const [isWaitlisted, setIsWaitlisted] = useState(false);
  const [contactsSupported, setContactsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedCount, setAddedCount] = useState<number | null>(null);
  const [isSaving, startSaving] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setContactsSupported(getContactsManager() !== null);
  }, []);

  const summary = useMemo(() => summarize(rows), [rows]);

  function reset() {
    setStage('input');
    setPasteText('');
    setSingleName('');
    setSinglePhone('');
    setSingleCompanions('0');
    setRows([]);
    setIsWaitlisted(false);
    setError(null);
    setAddedCount(null);
  }

  function goToReview(reviewed: ReviewedGuest[]) {
    if (reviewed.length === 0) {
      setError('invalidInput');
      return;
    }
    setError(null);
    setRows(reviewed);
    setStage('review');
  }

  function handleReviewPaste() {
    goToReview(reviewPastedText(pasteText, existingPhones));
  }

  function handleReviewSingle() {
    goToReview(
      reviewGuestRows(
        [{ name: singleName, phone: singlePhone, expectedCompanions: Number(singleCompanions) }],
        existingPhones,
      ),
    );
  }

  async function handlePickContacts() {
    const contacts = getContactsManager();
    if (!contacts) return;
    try {
      // Only name and tel are requested — never emails, addresses or the
      // full address book. The browser's own picker decides what is shared.
      const picked = await contacts.select(['name', 'tel'], { multiple: true });
      if (picked.length === 0) return;
      goToReview(
        reviewGuestRows(
          picked.map((c) => ({
            name: c.name?.[0]?.trim() ?? '',
            phone: c.tel?.[0]?.trim() ?? '',
          })),
          existingPhones,
        ),
      );
    } catch {
      // Cancelled or denied — leave the organizer where they were.
    }
  }

  async function handleVcfFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = file.name.toLowerCase().endsWith('.csv')
        ? parseGuestCsv(text)
        : parseVCard(text);
      if (parsed.length === 0) {
        setError('vcfEmpty');
        return;
      }
      goToReview(reviewGuestRows(parsed, existingPhones));
    } catch {
      setError('vcfEmpty');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function patchRow(id: string, patch: Partial<ReviewedGuest>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function patchPhone(id: string, rawPhone: string) {
    setRows((prev) => {
      const reviewed = reviewGuestRows(
        prev.map((row) => ({
          name: row.name,
          phone: row.id === id ? rawPhone : row.rawPhone,
          expectedCompanions: row.expectedCompanions,
        })),
        existingPhones,
      );
      return reviewed.map((row, index) => ({ ...row, id: prev[index].id }));
    });
  }

  function handleConfirm() {
    const chosen = rows.filter((r) => r.selected && r.name.trim());
    if (chosen.length === 0) {
      setError('invalidInput');
      return;
    }
    setError(null);

    const formData = new FormData();
    formData.set(
      'guestRows',
      JSON.stringify(
        // Save the normalized number so the same person can't be re-added
        // later under a different spelling — and so WhatsApp gets E.164.
        chosen.map((r) => ({
          name: r.name.trim(),
          phone: r.e164 ?? '',
          expectedCompanions: r.expectedCompanions,
        })),
      ),
    );
    formData.set('isWaitlisted', isWaitlisted ? 'true' : 'false');

    startSaving(async () => {
      const result: AddGuestsActionState = await addGuestsAction(eventId, {}, formData);
      if (result.error) setError(result.error);
      else {
        setAddedCount(result.addedCount ?? 0);
        setStage('input');
        setPasteText('');
        setRows([]);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button variant="outline" className="ms-auto" />}>
        <UserPlusIcon /> {t('trigger')}
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{stage === 'input' ? t('title') : t('reviewTitle')}</DialogTitle>
          <DialogDescription>
            {stage === 'input' ? t('description') : t('reviewDescription')}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{tErrors(error)}</AlertDescription>
          </Alert>
        )}
        {addedCount !== null && (
          <Alert>
            <AlertDescription>{t('success', { count: addedCount })}</AlertDescription>
          </Alert>
        )}

        {stage === 'input' ? (
          <div className="flex flex-col gap-4">
            <div className="bg-muted/30 grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_7rem_auto] sm:items-end">
              <div>
                <label className="text-sm font-medium" htmlFor="single-guest-name">
                  {t('nameLabel')}
                </label>
                <Input
                  id="single-guest-name"
                  value={singleName}
                  onChange={(e) => setSingleName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="single-guest-phone">
                  {t('phoneLabel')}
                </label>
                <PhoneInput id="single-guest-phone" value={singlePhone} onChange={setSinglePhone} />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="single-guest-companions">
                  {t('companionsLabel')}
                </label>
                <Input
                  id="single-guest-companions"
                  type="number"
                  min={0}
                  max={50}
                  dir="ltr"
                  value={singleCompanions}
                  onChange={(e) => setSingleCompanions(e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={!singleName.trim()}
                onClick={handleReviewSingle}
              >
                {t('submit')}
              </Button>
            </div>

            {/* The big paste box is the primary path: an organizer with 200
                guests already has the list somewhere. Contacts and vCard are
                conveniences layered on top, not the main route. */}
            <div className="flex flex-col gap-2">
              <label htmlFor="guest-paste" className="text-sm font-medium">
                {t('pasteListLabel')}
              </label>
              <Textarea
                id="guest-paste"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={t('pasteListPlaceholder')}
                dir="auto"
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-muted-foreground text-xs">{t('pasteListHint')}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" onClick={handleReviewPaste} disabled={!pasteText.trim()}>
                {t('reviewCta')}
              </Button>

              <span className="text-muted-foreground text-xs">{t('orImportFrom')}</span>

              {contactsSupported && (
                <Button type="button" variant="outline" size="sm" onClick={handlePickContacts}>
                  <ContactRoundIcon /> {t('importContacts')}
                </Button>
              )}

              {/* Always offered: it's the one import that works on iPhone,
                  Safari and desktop, where the Contact Picker doesn't exist. */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
              >
                <FileUpIcon /> {t('importVcf')}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".vcf,.csv,text/csv,text/vcard,text/x-vcard"
                className="hidden"
                onChange={handleVcfFile}
              />
            </div>

            {!contactsSupported && (
              <p className="text-muted-foreground text-xs">{t('contactsUnsupported')}</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="bg-muted/30 flex items-center gap-3 rounded-lg border p-3">
              <Switch
                id="add-guests-waitlisted"
                checked={isWaitlisted}
                onCheckedChange={setIsWaitlisted}
              />
              <div>
                <FieldLabel htmlFor="add-guests-waitlisted" className="font-medium">
                  {tGuests('waitlist.toggleLabel')}
                </FieldLabel>
                <p className="text-muted-foreground text-xs">{tGuests('waitlist.toggleHint')}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="default">{t('summaryImportable', { n: summary.importable })}</Badge>
              {summary.duplicateInList > 0 && (
                <Badge variant="secondary">
                  {t('summaryDuplicate', { n: summary.duplicateInList })}
                </Badge>
              )}
              {summary.alreadyAdded > 0 && (
                <Badge variant="secondary">
                  {t('summaryAlreadyAdded', { n: summary.alreadyAdded })}
                </Badge>
              )}
              {summary.invalidPhone > 0 && (
                <Badge variant="destructive">
                  {t('summaryInvalid', { n: summary.invalidPhone })}
                </Badge>
              )}
              {summary.missingPhone > 0 && (
                <Badge variant="outline">{t('summaryMissing', { n: summary.missingPhone })}</Badge>
              )}
            </div>

            <div className="max-h-[45vh] overflow-y-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="w-10 p-2"></th>
                    <th className="p-2 text-start font-medium">{t('nameLabel')}</th>
                    <th className="p-2 text-start font-medium">{t('phoneLabel')}</th>
                    <th className="w-24 p-2 text-start font-medium">{t('companionsLabel')}</th>
                    <th className="p-2 text-start font-medium">{t('statusLabel')}</th>
                    <th className="w-10 p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          disabled={row.issues.includes('invalidPhone')}
                          aria-label={t('includeRow')}
                          onChange={(e) => patchRow(row.id, { selected: e.target.checked })}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          value={row.name}
                          onChange={(e) => patchRow(row.id, { name: e.target.value })}
                          className="h-8"
                        />
                      </td>
                      <td className="p-2" dir="ltr">
                        <Input
                          value={row.e164 ? formatPhoneForDisplay(row.e164) : row.rawPhone}
                          onChange={(e) => patchPhone(row.id, e.target.value)}
                          className="h-8 min-w-32"
                          aria-invalid={row.issues.includes('invalidPhone')}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min={0}
                          max={50}
                          value={row.expectedCompanions}
                          onChange={(e) =>
                            patchRow(row.id, {
                              expectedCompanions: Math.max(
                                0,
                                Math.min(50, Number(e.target.value) || 0),
                              ),
                            })
                          }
                          className="h-8 w-20"
                          dir="ltr"
                        />
                      </td>
                      <td className="p-2">
                        {row.issues.length === 0 ? (
                          <span className="text-muted-foreground text-xs">{t('statusOk')}</span>
                        ) : (
                          <span className="text-xs">
                            {row.issues.map((i) => t(`issue.${i}`)).join('، ')}
                          </span>
                        )}
                      </td>
                      <td className="p-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t('removeRow')}
                          onClick={() => setRows((prev) => prev.filter((r) => r.id !== row.id))}
                        >
                          <Trash2Icon />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DialogFooter>
          {stage === 'review' && (
            <Button type="button" variant="outline" onClick={() => setStage('input')}>
              <ArrowLeftIcon className="rtl:-scale-x-100" /> {t('backToInput')}
            </Button>
          )}
          <Button
            type="button"
            onClick={stage === 'input' ? handleReviewPaste : handleConfirm}
            disabled={stage === 'input' ? !pasteText.trim() : isSaving || summary.importable === 0}
          >
            {stage === 'input'
              ? t('reviewCta')
              : isSaving
                ? t('submitting')
                : t('confirmImport', { n: summary.importable })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
