import { getTranslations } from 'next-intl/server';
import { eventTypes } from '@/lib/validations/events';

// Real, supported event types (the same enum the creation form uses) shown
// as large editorial tiles — not fabricated template screenshots showing
// designs that don't exist in the product yet (no visual theme picker is
// built). Large, tinted tiles instead of tiny generic pill chips.
const TILE_TINTS = [
  'linear-gradient(160deg, #c23855, #5c0e21)',
  'linear-gradient(160deg, #2c3550, #0e1420)',
  'linear-gradient(160deg, #6d4f82, #2f2038)',
  'linear-gradient(160deg, #c9a15a, #7a5b23)',
];

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
        {eventTypes.map((type, index) => (
          <div
            key={type}
            className="group relative flex aspect-[4/5] items-end overflow-hidden rounded-2xl p-5 transition-transform duration-300 ease-out hover:-translate-y-1"
            style={{ background: TILE_TINTS[index % TILE_TINTS.length] }}
          >
            <span className="text-lg font-bold text-white">{tTypes(type)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
