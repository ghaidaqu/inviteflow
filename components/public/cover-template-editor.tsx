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
  type WeddingTemplateId,
} from '@/components/public/wedding-invitation-templates';
import { ArrowRightIcon, DownloadIcon, Loader2Icon } from 'lucide-react';

// Bounding box the live preview scales into — see previewScale below.
const PREVIEW_MAX_WIDTH = 220;
const PREVIEW_MAX_HEIGHT = 260;

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

  function handleExport() {
    setError(null);
    startExporting(async () => {
      const node = previewRef.current;
      if (!node) return;
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
        <Button type="button" variant="secondary" onClick={handleExport} disabled={isExporting}>
          {isExporting ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <DownloadIcon className="size-4" />
          )}
          {isExporting ? t('exporting') : t('applyButton')}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-[minmax(0,220px)_1fr]">
        {/* Live preview, scaled down to fit the form — the ref target is
            rendered at its real full size (transform: scale only affects
            layout, not the captured pixels) so the exported PNG stays
            full resolution regardless of how small it previews here.
            Scaled into a bounding box, not a fixed width, since مربع
            and مستطيل are different shapes. */}
        <div className="mx-auto w-fit overflow-hidden rounded-lg border sm:mx-0">
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
              <Template data={data} ref={previewRef} />
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
            <Field>
              <FieldLabel htmlFor="tpl-title">{t('titleLabel')}</FieldLabel>
              <Input
                id="tpl-title"
                value={data.title}
                onChange={(e) => set('title', e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="tpl-subtitle">{t('subtitleLabel')}</FieldLabel>
              <Textarea
                id="tpl-subtitle"
                rows={2}
                value={data.subtitle}
                onChange={(e) => set('subtitle', e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
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
          </FieldGroup>
        </div>
      </div>
    </div>
  );
}
