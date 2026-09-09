'use client';

import { useState } from 'react';
import { ArrowLeftIcon, ArrowRightIcon, LinkIcon, MailIcon } from 'lucide-react';
import { Link } from '@/i18n/navigation';

type JourneyKey = 'invitation' | 'rsvp';

type TrackOption = {
  key: JourneyKey;
  href: string;
  badge: string;
  description: string;
  features: string[];
};

const ICONS = {
  invitation: MailIcon,
  rsvp: LinkIcon,
} satisfies Record<JourneyKey, typeof MailIcon>;

export function TrackOptionsSelector({
  locale,
  cta,
  options,
}: {
  locale: string;
  cta: string;
  options: TrackOption[];
}) {
  const [selected, setSelected] = useState<JourneyKey | null>(null);
  const selectedOption = options.find((option) => option.key === selected);
  const ArrowIcon = locale === 'ar' ? ArrowLeftIcon : ArrowRightIcon;

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6" role="radiogroup">
        {options.map((option) => {
          const Icon = ICONS[option.key];
          const isSelected = selected === option.key;

          return (
            <button
              key={option.key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setSelected(option.key)}
              className={`bg-card/75 text-primary focus-visible:ring-ring/60 grid w-full grid-cols-[auto_1fr] items-center gap-4 rounded-2xl border p-5 text-start shadow-sm transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-3 focus-visible:outline-none sm:p-6 ${
                isSelected
                  ? 'border-secondary ring-secondary/35 ring-3'
                  : 'border-border/80 hover:border-secondary/70'
              }`}
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-current/10 ring-1 ring-current/20">
                <Icon className="size-5" />
              </span>
              <span className="flex flex-col gap-1">
                <span className="bg-primary/10 w-fit rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide">
                  {option.badge}
                </span>
                <span className="font-display text-foreground text-lg sm:text-xl">
                  {option.description}
                </span>
                <span className="text-muted-foreground text-sm leading-relaxed">
                  {option.features.join(' · ')}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {selectedOption && (
        <div className="mt-5 flex justify-center">
          <Link
            href={selectedOption.href}
            className="bg-primary text-primary-foreground focus-visible:ring-ring hover:bg-primary/90 inline-flex min-h-11 items-center gap-2 rounded-lg px-8 py-2.5 text-sm font-semibold shadow-sm transition-colors focus-visible:ring-3 focus-visible:outline-none"
          >
            {cta}
            <ArrowIcon className="size-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
