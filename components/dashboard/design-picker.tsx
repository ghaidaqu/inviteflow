'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { updateEventDesignAction } from '@/lib/actions/events';
import { eventTemplates, type EventTemplate } from '@/lib/validations/event-design';
import { CheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Kept in sync with each template's actual background treatment in
// components/public/event-hero/*.tsx so this preview doesn't lie about
// what the guest page will look like.
const SWATCH_CLASS: Record<EventTemplate, string> = {
  classic: 'bg-gradient-to-br from-primary/15 via-secondary/30 to-primary/10 text-foreground',
  editorial: 'bg-foreground text-background',
  minimal: 'bg-card text-foreground border',
};

/**
 * Auto-saves on click (no separate "save" button) — this is a pure visual
 * preference with no other fields to coordinate, so the extra step would
 * only add friction. Public event page revalidates immediately via the
 * action's own revalidatePath.
 */
export function DesignPicker({
  eventId,
  currentTemplate,
}: {
  eventId: string;
  currentTemplate: string;
}) {
  const t = useTranslations('Events.design');
  const [isPending, startTransition] = useTransition();

  function handleSelect(template: EventTemplate) {
    if (template === currentTemplate) return;
    const formData = new FormData();
    formData.set('template', template);
    startTransition(() => {
      updateEventDesignAction(eventId, {}, formData);
    });
  }

  return (
    <div className="bg-card mt-6 rounded-2xl border p-5">
      <h2 className="text-sm font-bold">{t('title')}</h2>
      <p className="text-muted-foreground mt-1 text-xs">{t('hint')}</p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {eventTemplates.map((template) => {
          const selected = template === currentTemplate;
          return (
            <button
              key={template}
              type="button"
              disabled={isPending}
              onClick={() => handleSelect(template)}
              className={cn(
                'group relative flex flex-col items-center gap-2 rounded-xl border p-1 transition-[border-color,transform] duration-150 ease-out disabled:opacity-60',
                selected ? 'border-primary' : 'border-transparent hover:-translate-y-0.5',
              )}
            >
              <div
                className={cn(
                  'flex aspect-[4/3] w-full items-center justify-center rounded-lg text-[10px] font-bold',
                  SWATCH_CLASS[template],
                )}
              >
                Aa
              </div>
              <span className="text-xs font-medium">{t(`templates.${template}`)}</span>
              {selected && (
                <span className="bg-primary text-primary-foreground absolute end-1 top-1 flex size-4 items-center justify-center rounded-full">
                  <CheckIcon className="size-2.5" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
