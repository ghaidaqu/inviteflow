import type { EventHeroProps } from './types';

/**
 * Dark, formal, editorial — same near-black band language as the
 * homepage's FinalCta section, with the invitation name set in the
 * site's heavy display treatment (.font-display). Built for weddings,
 * institutional events, and anything that wants to read as an occasion
 * rather than a casual invite.
 */
export function EditorialHero({ event, typeLabel, organizedByLabel }: EventHeroProps) {
  const hasCover = Boolean(event.cover_image_url);
  const isVideo = hasCover && /\.(mp4|webm|mov)$/i.test(event.cover_image_url!);

  return (
    <div className="bg-foreground text-background overflow-hidden rounded-2xl shadow-xl">
      {(event.organization_name || event.organization_logo_url) && (
        <div className="flex items-center justify-center gap-2 pt-6 sm:justify-start sm:px-8">
          {event.organization_logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.organization_logo_url}
              alt=""
              className="size-7 rounded-full border border-white/20 bg-white/10 object-contain p-1"
            />
          )}
          {organizedByLabel && (
            <span className="text-background/60 text-xs font-medium">{organizedByLabel}</span>
          )}
        </div>
      )}

      <div className="relative flex flex-col items-center gap-4 px-6 py-14 text-center sm:px-10">
        {hasCover && (
          <div className="absolute inset-0 -z-10">
            {isVideo ? (
              <video
                src={event.cover_image_url!}
                className="size-full object-cover opacity-30"
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.cover_image_url!}
                alt=""
                className="size-full object-cover opacity-30"
              />
            )}
            <div className="from-foreground via-foreground/70 absolute inset-0 bg-gradient-to-t to-transparent" />
          </div>
        )}

        <span className="border-background/30 text-background/70 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase">
          {typeLabel}
        </span>

        <h1 className="font-display text-3xl leading-tight text-balance sm:text-5xl">
          {event.name}
        </h1>

        <span aria-hidden className="bg-background/30 h-px w-16" />

        {event.description && (
          <p className="text-background/70 max-w-lg text-balance whitespace-pre-line">
            {event.description}
          </p>
        )}
      </div>
    </div>
  );
}
