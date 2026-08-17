import type { EventHeroProps } from './types';

/**
 * Clean and quiet — no gradient wash, no colored badge. A contained cover
 * photo (not full-bleed) if there is one, generous whitespace, and a thin
 * rule instead of a card border. Built for workshops, meetups, and
 * anything that reads better understated than declarative.
 */
export function MinimalHero({ event, typeLabel, organizedByLabel }: EventHeroProps) {
  return (
    <div className="flex flex-col items-center gap-5 py-4 text-center">
      {(event.organization_name || event.organization_logo_url) && (
        <div className="flex items-center gap-2">
          {event.organization_logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.organization_logo_url}
              alt=""
              className="bg-card size-7 rounded-full border object-contain p-1"
            />
          )}
          {organizedByLabel && (
            <span className="text-muted-foreground text-xs font-medium">{organizedByLabel}</span>
          )}
        </div>
      )}

      {event.cover_image_url &&
        (/\.(mp4|webm|mov)$/i.test(event.cover_image_url) ? (
          <video
            src={event.cover_image_url}
            className="aspect-square w-40 rounded-full object-cover shadow-sm"
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
            className="aspect-square w-40 rounded-full object-cover shadow-sm"
          />
        ))}

      <span className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
        {typeLabel}
      </span>

      <h1 className="text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
        {event.name}
      </h1>

      <span aria-hidden className="bg-border h-px w-12" />

      {event.description && (
        <p className="text-muted-foreground max-w-md text-balance whitespace-pre-line">
          {event.description}
        </p>
      )}
    </div>
  );
}
