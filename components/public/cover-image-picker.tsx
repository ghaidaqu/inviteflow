'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CoverImageUpload } from '@/components/dashboard/cover-image-upload';
import { CoverTemplateEditor } from '@/components/public/cover-template-editor';
import {
  SquareWeddingTemplate,
  RectangleWeddingTemplate,
  defaultWeddingCardData,
  WEDDING_TEMPLATE_DIMENSIONS,
  type WeddingTemplateId,
} from '@/components/public/wedding-invitation-templates';
import { ImageUpIcon, SparklesIcon } from 'lucide-react';

export type CoverPickerMode = 'upload' | 'gallery' | { editing: WeddingTemplateId };

const GALLERY_ITEMS: Array<{ id: WeddingTemplateId; Component: typeof SquareWeddingTemplate }> = [
  { id: 'square', Component: SquareWeddingTemplate },
  { id: 'rectangle', Component: RectangleWeddingTemplate },
];

// Thumbnail width in px — مربع (1:1) and مستطيل (2:3) each keep their own
// real aspect ratio at this width, so the two gallery tiles end up
// genuinely different shapes, same as the real cards.
const THUMB_WIDTH = 128;

/**
 * Wraps the plain file-upload cover field with a second path: pick one of
 * Mahalli's own wedding designs and customize it instead of needing a
 * finished image already. Scoped to the invitation quick-start track for
 * now — the two designs are both wedding invitations regardless of which
 * event type the organizer picked earlier, since that's what was asked
 * for; broadening past weddings (or into the dashboard's own EventForm
 * and the Link track) is a separate, later step.
 */
export function CoverImagePicker({
  value,
  onChange,
  mode: controlledMode,
  onModeChange,
}: {
  value: string;
  onChange: (url: string) => void;
  /**
   * Lifted to the caller so it can tell the difference between "on the
   * design step" and "deep inside the gallery/editor sub-flow" — a wizard
   * embedding this (see QuickStartWizard) needs that to make its own
   * Back button close the editor first instead of leaving the step
   * entirely, since "رجوع" reads as "back up one level" to someone who
   * just opened a template, not "abandon this step's progress and go to
   * the previous one." Falls back to uncontrolled internal state when
   * omitted, so simpler embeddings don't have to wire this up.
   */
  mode?: CoverPickerMode;
  onModeChange?: (mode: CoverPickerMode) => void;
}) {
  const t = useTranslations('Events.form.coverTemplates');
  const [internalMode, setInternalMode] = useState<CoverPickerMode>('upload');
  const mode = controlledMode ?? internalMode;
  const setMode = onModeChange ?? setInternalMode;

  if (typeof mode === 'object') {
    return (
      <CoverTemplateEditor
        templateId={mode.editing}
        onBack={() => setMode('gallery')}
        onApply={(url) => {
          onChange(url);
          setMode('upload');
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-muted inline-flex w-fit gap-1 rounded-full p-1">
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === 'upload' ? 'bg-card shadow-sm' : 'text-muted-foreground'
          }`}
        >
          <ImageUpIcon className="size-4" />
          {t('uploadTab')}
        </button>
        <button
          type="button"
          onClick={() => setMode('gallery')}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === 'gallery' ? 'bg-card shadow-sm' : 'text-muted-foreground'
          }`}
        >
          <SparklesIcon className="size-4" />
          {t('galleryTab')}
        </button>
      </div>

      {mode === 'upload' ? (
        <CoverImageUpload value={value} onChange={onChange} />
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-xs">{t('galleryHint')}</p>
          <div className="flex flex-wrap gap-3">
            {GALLERY_ITEMS.map(({ id, Component }) => {
              const { width: cardWidth, height: cardHeight } = WEDDING_TEMPLATE_DIMENSIONS[id];
              const scale = THUMB_WIDTH / cardWidth;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMode({ editing: id })}
                  className="hover-glow group flex flex-col gap-2 rounded-lg"
                >
                  <div
                    className="border-border overflow-hidden rounded-lg border"
                    style={{ width: THUMB_WIDTH, aspectRatio: `${cardWidth} / ${cardHeight}` }}
                  >
                    <div
                      style={{
                        width: cardWidth,
                        height: cardHeight,
                        transform: `scale(${scale})`,
                        transformOrigin: 'top left',
                      }}
                    >
                      <Component data={defaultWeddingCardData(id)} />
                    </div>
                  </div>
                  <span className="text-foreground text-xs font-medium">
                    {t(`templates.${id}`)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
