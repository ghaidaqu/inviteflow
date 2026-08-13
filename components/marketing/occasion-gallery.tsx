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
const TILE_TINTS = [
  'linear-gradient(160deg, #c23855, #5c0e21)',
  'linear-gradient(160deg, #2c3550, #0e1420)',
  'linear-gradient(160deg, #6d4f82, #2f2038)',
  'linear-gradient(160deg, #c9a15a, #7a5b23)',
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
      className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-28"
    >
      <div className="max-w-xl">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('title')}</h2>
        <p className="text-muted-foreground mt-3 text-lg">{t('subtitle')}</p>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {eventTypes.map((type, index) => {
          const Icon = TYPE_ICONS[type];
          return (
            <div
              key={type}
              // Was aspect-[4/5], which made eight near-empty columns of
              // gradient. A landscape tile holds the icon + label
              // comfortably and cuts the section's height roughly in half.
              className="group relative flex aspect-[16/10] flex-col justify-between overflow-hidden rounded-2xl p-4 transition-transform duration-300 ease-out hover:-translate-y-1 sm:p-5"
              style={{ background: TILE_TINTS[index % TILE_TINTS.length] }}
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm">
                <Icon className="size-4.5" />
              </span>
              <span className="text-base font-bold text-white sm:text-lg">{tTypes(type)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
