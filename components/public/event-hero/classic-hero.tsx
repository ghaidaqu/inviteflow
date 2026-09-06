import { Badge } from '@/components/ui/badge';
import { isVideoUrl } from '@/lib/utils/media';
import type { EventHeroProps } from './types';

/** The original single layout — warm gradient card, rounded cover image. */
export function ClassicHero({ event, typeLabel, organizedByLabel }: EventHeroProps) {
  return (
    <>
      {(event.organization_name || event.organization_logo_url) && (
        <div className="mb-4 flex items-center justify-center gap-2 sm:justify-start">
          {event.organization_logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.organization_logo_url}
              alt=""
              className="bg-card size-8 rounded-full border object-contain p-1"
            />
          )}
          {organizedByLabel && (
            <span className="text-muted-foreground text-sm font-medium">{organizedByLabel}</span>
          )}
        </div>
      )}

      {event.cover_image_url ? (
        isVideoUrl(event.cover_image_url) ? (
          <video
            src={event.cover_image_url}
            // No fixed aspect-ratio box + object-cover: that convention
            // suits an arbitrary uploaded photo, but it crops a
            // template-generated invitation (square or the taller
            // rectangle shape) down to a thin horizontal strip, losing
            // most of the card. object-contain inside a height cap shows
            // the whole cover at its own real shape instead — square
            // stays visibly square, a landscape photo still fills the
            // width the same way it did before.
            className="mb-6 max-h-[560px] w-full rounded-2xl object-contain shadow-lg"
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.cover_image_url}
            alt={event.name}
            className="mb-6 max-h-[560px] w-full rounded-2xl object-contain shadow-lg"
          />
        )
      ) : (
        // Warm, welcoming wash — primary and secondary only, never the
        // accent cyan (that stays reserved for hover/focus/selected
        // states across the app, not a resting background).
        <div className="from-primary/15 via-secondary/30 to-primary/10 mb-6 flex aspect-[2/1] w-full flex-col items-center justify-center rounded-2xl bg-gradient-to-br p-6 text-center shadow-sm">
          <Badge className="mb-3">{typeLabel}</Badge>
          <h1 className="font-display text-3xl text-balance sm:text-4xl">{event.name}</h1>
        </div>
      )}

      {event.cover_image_url && (
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h1 className="font-display text-3xl text-balance sm:text-4xl">{event.name}</h1>
          <Badge>{typeLabel}</Badge>
        </div>
      )}

      {event.description && (
        <p className="text-muted-foreground mt-4 text-center whitespace-pre-line sm:text-start">
          {event.description}
        </p>
      )}
    </>
  );
}
