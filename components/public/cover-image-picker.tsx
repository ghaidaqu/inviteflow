'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CoverImageUpload } from '@/components/dashboard/cover-image-upload';
import { CoverTemplateEditor } from '@/components/public/cover-template-editor';
import { CoverTextEditor } from '@/components/public/cover-text-editor';
import {
  SquareWeddingTemplate,
  RectangleWeddingTemplate,
  ArchwayWeddingTemplate,
  defaultWeddingCardData,
  WEDDING_TEMPLATE_DIMENSIONS,
  type WeddingTemplateId,
} from '@/components/public/wedding-invitation-templates';
import { ImageUpIcon, SparklesIcon, TypeIcon } from 'lucide-react';

export type CoverPickerMode = 'upload' | 'gallery' | 'text' | { editing: WeddingTemplateId };

const GALLERY_ITEMS: Array<{ id: WeddingTemplateId; Component: typeof SquareWeddingTemplate }> = [
  { id: 'square', Component: SquareWeddingTemplate },
  { id: 'rectangle', Component: RectangleWeddingTemplate },
  { id: 'archway', Component: ArchwayWeddingTemplate },
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

  if (mode === 'text') {
    return (
      <CoverTextEditor
        onBack={() => setMode('upload')}
        onApply={(url) => {
          onChange(url);
          setMode('upload');
        }}
      />
    );
  }

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

  // Three ways in, offered as one choice rather than a strip of tabs with
  // a newcomer bolted on the end. An organizer arrives already knowing
  // which of these they are — they have a design, they want one of ours,
  // or they have written the words and want those sent — so the question
  // is asked once, up front, with all three weighted the same.
  const CHOICES = [
    { id: 'text' as const, Icon: TypeIcon, label: t('textTab'), hint: t('textChoiceHint') },
    {
      id: 'upload' as const,
      Icon: ImageUpIcon,
      label: t('uploadTab'),
      hint: t('uploadChoiceHint'),
    },
    {
      id: 'gallery' as const,
      Icon: SparklesIcon,
      label: t('galleryTab'),
      hint: t('galleryChoiceHint'),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t('chooseLabel')}>
        {CHOICES.map(({ id, Icon, label, hint }) => {
          const active = mode === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setMode(id)}
              className={`focus-visible:ring-ring flex flex-col items-start gap-1 rounded-xl border p-3 text-start transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                active
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border/70 hover:border-primary/50'
              }`}
            >
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                <Icon className="size-4" />
                {label}
              </span>
              <span className="text-muted-foreground text-xs leading-snug">{hint}</span>
            </button>
          );
        })}
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
                    style={{
                      width: THUMB_WIDTH,
                      aspectRatio: `${cardWidth} / ${cardHeight}`,
                      // In RTL (the whole app's default direction), a
                      // block child wider than its container overflows
                      // toward the container's *own* start edge (the
                      // right, in RTL) — governed by this containing
                      // block's direction, not the child's — so the child
                      // below ends up positioned far to the left of this
                      // box instead of flush with its top-left corner,
                      // and `transformOrigin: 'top left'` then scales the
                      // real thumbnail off-screen, leaving only this
                      // empty card background visible. Forcing ltr on the
                      // *container* is what the scale math actually
                      // assumes; setting it on the scaled child itself
                      // doesn't change how this box's own layout placed
                      // that child to begin with.
                      direction: 'ltr',
                    }}
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
