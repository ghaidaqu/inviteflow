'use client';

import { useRef, useState, useTransition } from 'react';
import { toPng } from 'html-to-image';
import { useTranslations } from 'next-intl';
import { ArrowRightIcon, Loader2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { uploadCoverImageAction } from '@/lib/actions/uploads';
import { TEXT_CARD_SIZE, TextInvitationCard } from '@/components/public/text-invitation-card';

/** Wide enough that the preview is readable, small enough to sit inside
 *  the wizard step without pushing the buttons off a phone. */
const PREVIEW_WIDTH = 260;

/**
 * Write the invitation instead of uploading one.
 *
 * Same ending as the template editor: the live preview is rasterized and
 * put through the very same uploadCoverImageAction the plain file field
 * uses, so everything downstream — the event's cover, the WhatsApp
 * header, the public page — receives an ordinary image URL and needs no
 * knowledge that this one was typed rather than designed.
 *
 * That also means no new column and no migration: the text lives on as
 * the card it produced.
 */
export function CoverTextEditor({
  onBack,
  onApply,
}: {
  onBack: () => void;
  onApply: (url: string) => void;
}) {
  const t = useTranslations('Events.form.coverTemplates');
  const previewRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isExporting, startExporting] = useTransition();

  const trimmed = text.trim();

  function handleApply() {
    const node = previewRef.current;
    if (!node || !trimmed) return;
    setError(null);

    startExporting(async () => {
      try {
        // Amiri has to be loaded before rasterizing or the card exports
        // in a fallback face — the same wait the template editor does.
        await document.fonts.ready;
        const dataUrl = await toPng(node, {
          width: TEXT_CARD_SIZE,
          height: TEXT_CARD_SIZE,
          pixelRatio: 1,
          cacheBust: true,
        });
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], 'invitation-text.png', { type: 'image/png' });
        const formData = new FormData();
        formData.set('file', file);
        const result = await uploadCoverImageAction({}, formData);
        if (result.error || !result.url) {
          setError(t('exportFailed'));
          return;
        }
        onApply(result.url);
      } catch {
        setError(t('exportFailed'));
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm"
      >
        <ArrowRightIcon className="size-4 rtl:rotate-180" />
        {t('back')}
      </button>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-2">
          <label htmlFor="cover-text" className="text-sm font-medium">
            {t('textLabel')}
          </label>
          <Textarea
            id="cover-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={9}
            maxLength={800}
            placeholder={t('textPlaceholder')}
          />
          <p className="text-muted-foreground text-xs">{t('textHint')}</p>
        </div>

        {/* Scaled down for the screen; the node itself stays at full card
            size so the export is 1080px regardless of this preview. */}
        <div
          className="border-border mx-auto overflow-hidden rounded-lg border"
          style={{ width: PREVIEW_WIDTH, height: PREVIEW_WIDTH }}
        >
          <div
            style={{
              width: TEXT_CARD_SIZE,
              height: TEXT_CARD_SIZE,
              transform: `scale(${PREVIEW_WIDTH / TEXT_CARD_SIZE})`,
              transformOrigin: 'top right',
            }}
          >
            <TextInvitationCard ref={previewRef} text={trimmed || t('textPlaceholder')} />
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        type="button"
        onClick={handleApply}
        disabled={!trimmed || isExporting}
        className="w-fit"
      >
        {isExporting && <Loader2Icon className="size-4 animate-spin" />}
        {isExporting ? t('exporting') : t('applyText')}
      </Button>
    </div>
  );
}
