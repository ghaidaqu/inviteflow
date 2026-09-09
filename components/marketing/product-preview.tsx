import { getTranslations } from 'next-intl/server';
import { BrandMark } from '@/components/brand-mark';
import { CheckIcon, XIcon, CalendarIcon, MapPinIcon } from 'lucide-react';

/**
 * What the guest actually receives — the single biggest thing the
 * homepage was missing. It sold invitations without ever showing one, so
 * a visitor had to imagine the product before deciding to try it.
 *
 * Built as real markup rather than a screenshot, on purpose: a screenshot
 * of a WhatsApp thread ages the moment either app changes, can't be read
 * by a screen reader, and blurs on a phone. This renders the same two
 * things the product genuinely sends — the invitation message with its
 * two reply buttons, and the entry pass — using the app's own type and
 * color, so it can never drift from what the product really looks like.
 *
 * The names and date here are obviously a sample (a generic couple, a
 * placeholder hall) — nothing here is dressed up as a real customer's
 * event, and there's no invented testimonial or usage number anywhere on
 * this page.
 */
export async function ProductPreview() {
  const t = await getTranslations('HomePage.preview');

  return (
    <section className="bg-muted/30 border-border/60 border-b py-14 sm:py-20">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <h2 className="text-primary text-lg font-bold sm:text-xl">{t('eyebrow')}</h2>
        <p className="font-display mt-2 max-w-xl text-xl text-balance sm:text-2xl">{t('title')}</p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 sm:gap-8">
          {/* 1 — the WhatsApp message, as the guest sees it */}
          <figure className="flex flex-col gap-3">
            <div className="bg-card rounded-2xl border p-4 shadow-sm">
              <div className="bg-background rounded-xl border p-4">
                <p className="text-sm leading-relaxed">{t('messageBody')}</p>
                <dl className="text-muted-foreground mt-3 flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <CalendarIcon className="size-3.5 shrink-0" />
                    <dd>{t('messageDate')}</dd>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPinIcon className="size-3.5 shrink-0" />
                    <dd>{t('messagePlace')}</dd>
                  </div>
                </dl>
              </div>
              {/* Three buttons, matching what lib/whatsapp/notify.ts really
                  sends: accept, decline, and — whenever the event has a map
                  URL — the location. Showing only the first two here made
                  the preview quietly understate the message. */}
              <div className="mt-3 grid grid-cols-3 gap-2">
                <span className="border-border text-primary flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium">
                  <CheckIcon className="size-4" />
                  {t('replyYes')}
                </span>
                <span className="border-border text-muted-foreground flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium">
                  <XIcon className="size-4" />
                  {t('replyNo')}
                </span>
                <span className="border-border text-muted-foreground flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium">
                  <MapPinIcon className="size-4" />
                  {t('replyLocation')}
                </span>
              </div>
            </div>
            <figcaption className="text-muted-foreground text-sm">{t('messageCaption')}</figcaption>
          </figure>

          {/* 2 — the entry pass, the same card qr.service.ts generates */}
          <figure className="flex flex-col gap-3">
            <div className="bg-card flex flex-col items-center rounded-2xl border p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <BrandMark className="size-5" />
                <span className="font-display text-base">{t('passBrand')}</span>
              </div>
              <p className="font-display mt-4 text-xl">{t('passTitle')}</p>
              <div
                aria-hidden
                className="border-foreground/15 mt-4 grid size-32 grid-cols-6 gap-0.5 rounded-lg border p-2"
              >
                {/* A fixed decorative pattern, not a scannable code — a
                    working QR on a marketing page would point somewhere,
                    and there's nowhere honest for it to point. */}
                {QR_PATTERN.map((filled, i) => (
                  <span
                    key={i}
                    className={filled ? 'bg-foreground rounded-[1px]' : 'bg-transparent'}
                  />
                ))}
              </div>
              <p className="text-muted-foreground mt-4 text-xs">{t('passCaption')}</p>
            </div>
            <figcaption className="text-muted-foreground text-sm">{t('passFigCaption')}</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

// 6x6 stylised code block — corner anchors plus a scattered middle, so it
// reads as "a QR" at a glance without pretending to be a real one.
const QR_PATTERN = [
  true,
  true,
  false,
  false,
  true,
  true,
  true,
  false,
  true,
  true,
  false,
  true,
  false,
  true,
  true,
  false,
  true,
  false,
  false,
  true,
  false,
  true,
  true,
  false,
  true,
  false,
  true,
  true,
  false,
  true,
  true,
  true,
  false,
  false,
  true,
  true,
];
