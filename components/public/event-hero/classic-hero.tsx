import { Badge } from '@/components/ui/badge';
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
        /\.(mp4|webm|mov)$/i.test(event.cover_image_url) ? (
          <video
            src={event.cover_image_url}
            className="mb-6 aspect-video w-full rounded-2xl object-cover shadow-lg"
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
            className="mb-6 aspect-video w-full rounded-2xl object-cover shadow-lg"
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
