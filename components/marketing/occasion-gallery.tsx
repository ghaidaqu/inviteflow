import { getTranslations } from 'next-intl/server';
import { eventTypes } from '@/lib/validations/events';

// Real, supported event types (same enum the creation form uses) — not a
// fabricated "template gallery" with designs that don't actually exist yet.
export async function OccasionGallery() {
  const t = await getTranslations('HomePage.occasions');
  const tTypes = await getTranslations('Events.types');

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-xl text-center">
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t('title')}</h2>
        <p className="text-muted-foreground mt-3 text-base">{t('subtitle')}</p>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        {eventTypes.map((type) => (
          <span
            key={type}
            className="bg-card hover:border-primary/40 rounded-full border px-5 py-2.5 text-sm font-medium transition-[transform,border-color] duration-150 ease-out hover:-translate-y-0.5"
          >
            {tTypes(type)}
          </span>
        ))}
      </div>
    </section>
  );
}
