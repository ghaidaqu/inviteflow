import { getTranslations } from 'next-intl/server';
import { eventTypes } from '@/lib/validations/events';
import {
  HeartIcon,
  GraduationCapIcon,
  UsersIcon,
  WrenchIcon,
  TrophyIcon,
  PresentationIcon,
  LockIcon,
  SparklesIcon,
  type LucideIcon,
} from 'lucide-react';

// Real, supported event types (the same enum the creation form uses) shown
// as editorial tiles — not fabricated template screenshots showing designs
// that don't exist in the product yet (no visual theme picker is built).
// Four token-driven surfaces instead of four bespoke hex gradients — the
// same rotation the rest of the redesign uses, so this section reads as
// part of the same system rather than its own bespoke palette.
const TILE_SURFACES = [
  'bg-primary text-primary-foreground',
  'bg-secondary text-secondary-foreground',
  'bg-foreground text-background',
  'bg-muted text-foreground',
];

// One icon per supported type. These carry the tile visually instead of
// leaving a tall gradient rectangle with a single word floating at the
// bottom — and unlike photography they cost nothing to load.
const TYPE_ICONS: Record<(typeof eventTypes)[number], LucideIcon> = {
  wedding: HeartIcon,
  graduation: GraduationCapIcon,
  university_meetup: UsersIcon,
  workshop: WrenchIcon,
  sports: TrophyIcon,
  conference: PresentationIcon,
  private: LockIcon,
  other: SparklesIcon,
};

export async function OccasionGallery() {
  const t = await getTranslations('HomePage.occasions');
  const tTypes = await getTranslations('Events.types');

  return (
    <section
      id="templates"
      className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 py-12 sm:px-6 sm:py-16"
    >
      <div className="max-w-xl">
        <h2 className="font-display text-3xl sm:text-4xl">{t('title')}</h2>
        <p className="text-muted-foreground mt-3 text-lg">{t('subtitle')}</p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {eventTypes.map((type, index) => {
          const Icon = TYPE_ICONS[type];
          return (
            <div
              key={type}
              // Was aspect-[4/5], which made eight near-empty columns of
              // gradient. A landscape tile holds the icon + label
              // comfortably and cuts the section's height roughly in half.
              className={`hover-glow relative flex aspect-[16/10] flex-col justify-between overflow-hidden rounded-2xl p-4 sm:p-5 ${TILE_SURFACES[index % TILE_SURFACES.length]}`}
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-current/10">
                <Icon className="size-4.5" />
              </span>
              <span className="text-base font-bold sm:text-lg">{tTypes(type)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
