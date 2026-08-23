'use client';

import { useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toPng } from 'html-to-image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldLabel, FieldGroup } from '@/components/ui/field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { uploadCoverImageAction } from '@/lib/actions/uploads';
import {
  WEDDING_TEMPLATE_COMPONENTS,
  WEDDING_TEMPLATE_DIMENSIONS,
  WEDDING_PALETTES,
  defaultWeddingCardData,
  type WeddingCardData,
  type WeddingCardBlockId,
  type WeddingTemplateId,
} from '@/components/public/wedding-invitation-templates';
import { ArrowRightIcon, DownloadIcon, Loader2Icon, RotateCcwIcon } from 'lucide-react';

// Bounding box the live preview scales into — see previewScale below.
// The editor stacks preview-then-form (not side-by-side) since the
// quick-start wizard's own container caps out at max-w-lg (512px): a
// side-by-side split left so little room for the form column that its
// own 3-across date/time/location row was clipping its own values (a
// `sm:` breakpoint reacting to viewport width, not this narrow nested
// column's actual width). Stacked, the preview can be a bit bigger and
// the form gets the container's full width to work with.
const PREVIEW_MAX_WIDTH = 260;
const PREVIEW_MAX_HEIGHT = 320;

/**
 * The editing surface for one of the two built-in wedding designs —
 * reached from CoverImagePicker once the organizer picks a template.
 * Every field here writes into local state only; nothing is saved until
 * "تحميل الدعوة" rasterizes the live preview to a PNG (html-to-image,
 * client-side, no server render needed since the fonts are already
 * self-hosted same-origin) and pushes it through the exact same
 * uploadCoverImageAction the plain file-upload path uses — so from the
 * rest of the form's point of view, a template-generated cover is
 * indistinguishable from an uploaded one, just a coverImageUrl string.
 */
export function CoverTemplateEditor({
  templateId,
  onBack,
  onApply,
}: {
  templateId: WeddingTemplateId;
  onBack: () => void;
  onApply: (url: string) => void;
}) {
  const t = useTranslations('Events.form.coverTemplates');
  const previewRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<WeddingCardData>(() => defaultWeddingCardData(templateId));
  const [isExporting, startExporting] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const Template = WEDDING_TEMPLATE_COMPONENTS[templateId];
  const { width: cardWidth, height: cardHeight } = WEDDING_TEMPLATE_DIMENSIONS[templateId];
  // Fit the card into a bounding box rather than a fixed width — مربع is
  // 1:1 and مستطيل is a taller 2:3, so scaling both to the same width
  // would make one preview far taller than the other instead of both
  // reading as "a card, previewed small."
  const previewScale = Math.min(PREVIEW_MAX_WIDTH / cardWidth, PREVIEW_MAX_HEIGHT / cardHeight);
  const previewWidth = cardWidth * previewScale;
  const previewHeight = cardHeight * previewScale;

  function set<K extends keyof WeddingCardData>(key: K, value: WeddingCardData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function setBlockOffset(id: WeddingCardBlockId, offset: { x: number; y: number }) {
    setData((prev) => ({ ...prev, offsets: { ...prev.offsets, [id]: offset } }));
  }

  const hasCustomPositions = Object.keys(data.offsets).length > 0;

  function handleExport() {
    setError(null);
    startExporting(async () => {
      const node = previewRef.current;
      if (!node) return;

      // The dashed drag-outline is an editing affordance, not part of
      // the invitation — strip it directly on the live DOM right before
      // capture, synchronously, rather than through a React state flag.
      // A state toggle (render editable=false, wait a couple of
      // animation frames, then capture) looked correct but the outline
      // still showed up in the exported PNG in practice — asking React's
      // render/commit/paint pipeline to finish in time for an imperative
      // read straight after is exactly the kind of timing this project
      // avoids elsewhere too. Mutating the DOM directly has no such gap:
      // by the next line, the style is already gone.
      const outlined = [...node.querySelectorAll<HTMLElement>('[data-drag-outline]')];
      const savedStyles = outlined.map((el) => el.getAttribute('style'));
      outlined.forEach((el) => {
        el.style.outline = 'none';
        el.style.cursor = '';
      });

      try {
        const dataUrl = await toPng(node, {
          width: cardWidth,
          height: cardHeight,
          pixelRatio: 2,
          cacheBust: true,
        });
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], 'invitation-cover.png', { type: 'image/png' });
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
      } finally {
        // Restore exactly what was there before, whether the export
        // succeeded, failed, or threw — the organizer may keep editing.
        outlined.forEach((el, i) => {
          const saved = savedStyles[i];
          if (saved === null) el.removeAttribute('style');
          else el.setAttribute('style', saved);
        });
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowRightIcon className="size-4 rtl:rotate-180" />
          {t('backToGallery')}
        </Button>
        <div className="flex items-center gap-2">
          {hasCustomPositions && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setData((prev) => ({ ...prev, offsets: {} }))}
            >
              <RotateCcwIcon className="size-4" />
              {t('resetPositions')}
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <DownloadIcon className="size-4" />
            )}
            {isExporting ? t('exporting') : t('applyButton')}
          </Button>
        </div>
      </div>

      <p className="text-muted-foreground -mt-2 text-xs">{t('dragHint')}</p>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-4">
        {/* Live preview, scaled down to fit the form — the ref target is
            rendered at its real full size (transform: scale only affects
            layout, not the captured pixels) so the exported PNG stays
            full resolution regardless of how small it previews here.
            Scaled into a bounding box, not a fixed width, since مربع
            and مستطيل are different shapes. */}
        <div className="mx-auto w-fit overflow-hidden rounded-lg border">
          <div
            style={{
              width: previewWidth,
              height: previewHeight,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                transform: `scale(${previewScale})`,
                transformOrigin: 'top left',
                position: 'absolute',
                top: 0,
                left: 0,
              }}
            >
              <Template
                data={data}
                ref={previewRef}
                editable={!isExporting}
                scale={previewScale}
                onOffsetChange={setBlockOffset}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <FieldLabel className="mb-2 block">{t('colorLabel')}</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {WEDDING_PALETTES.map((palette) => (
                <button
                  key={palette.id}
                  type="button"
                  onClick={() =>
                    setData((prev) => ({
                      ...prev,
                      backgroundColor: palette.backgroundColor,
                      accentColor: palette.accentColor,
                      textColor: palette.textColor,
                    }))
                  }
                  aria-label={t(`palettes.${palette.id}`)}
                  className="hover-glow size-9 shrink-0 overflow-hidden rounded-full border-2"
                  style={{
                    borderColor:
                      data.accentColor === palette.accentColor
                        ? palette.accentColor
                        : 'transparent',
                    background: `linear-gradient(135deg, ${palette.backgroundColor} 50%, ${palette.accentColor} 50%)`,
                  }}
                />
              ))}
              <label
                className="border-border flex size-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 text-[10px]"
                title={t('customColor')}
              >
                <input
                  type="color"
                  value={data.accentColor}
                  onChange={(e) => set('accentColor', e.target.value)}
                  className="size-12 cursor-pointer border-none p-0"
                />
              </label>
            </div>
          </div>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="tpl-eyebrow">{t('eyebrowLabel')}</FieldLabel>
              <Input
                id="tpl-eyebrow"
                value={data.eyebrow}
                onChange={(e) => set('eyebrow', e.target.value)}
              />
            </Field>
            {/* The two hosting families, named as "يتشرف [x] و [y]" on the
                card — stacked (not side-by-side) for the same reason the
                date/time/location row below is: this column is too
                narrow for a viewport-based breakpoint to size correctly. */}
            <div className="flex flex-col gap-4">
              <Field>
                <FieldLabel htmlFor="tpl-host1">{t('hostName1Label')}</FieldLabel>
                <Input
                  id="tpl-host1"
                  value={data.hostName1}
                  onChange={(e) => set('hostName1', e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="tpl-host2">{t('hostName2Label')}</FieldLabel>
                <Input
                  id="tpl-host2"
                  value={data.hostName2}
                  onChange={(e) => set('hostName2', e.target.value)}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="tpl-invitation">{t('invitationLineLabel')}</FieldLabel>
              <Input
                id="tpl-invitation"
                value={data.invitationLine}
                onChange={(e) => set('invitationLine', e.target.value)}
              />
            </Field>
            <div className="flex flex-col gap-4">
              <Field>
                <FieldLabel htmlFor="tpl-groom">{t('groomFullNameLabel')}</FieldLabel>
                <Input
                  id="tpl-groom"
                  value={data.groomFullName}
                  onChange={(e) => set('groomFullName', e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="tpl-bride-father">{t('brideFatherNameLabel')}</FieldLabel>
                <Input
                  id="tpl-bride-father"
                  value={data.brideFatherName}
                  onChange={(e) => set('brideFatherName', e.target.value)}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="tpl-subtitle">{t('subtitleLabel')}</FieldLabel>
              <Textarea
                id="tpl-subtitle"
                rows={2}
                value={data.subtitle}
                onChange={(e) => set('subtitle', e.target.value)}
              />
            </Field>
            {/* Stacked, not a 3-across grid — this column is narrower than
                a `sm:` breakpoint accounts for, and these values (e.g.
                "الخميس ١٦ يوليو ٢٠٢٦") need more than a third of it to
                show without clipping. */}
            <div className="flex flex-col gap-4">
              <Field>
                <FieldLabel htmlFor="tpl-date">{t('dateLabel')}</FieldLabel>
                <Input
                  id="tpl-date"
                  value={data.dateText}
                  onChange={(e) => set('dateText', e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="tpl-time">{t('timeLabel')}</FieldLabel>
                <Input
                  id="tpl-time"
                  value={data.timeText}
                  onChange={(e) => set('timeText', e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="tpl-location">{t('locationLabel')}</FieldLabel>
                <Input
                  id="tpl-location"
                  value={data.locationText}
                  onChange={(e) => set('locationText', e.target.value)}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="tpl-closing">{t('closingLineLabel')}</FieldLabel>
              <Input
                id="tpl-closing"
                value={data.closingLine}
                onChange={(e) => set('closingLine', e.target.value)}
              />
            </Field>
          </FieldGroup>
        </div>
      </div>
    </div>
  );
}
