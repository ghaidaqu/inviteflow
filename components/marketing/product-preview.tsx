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
 * by a screen reader, and blurs on a phone. This walks through the three
 * real guest moments — the invitation with all three actions, the RSVP
 * confirmation, and the entry pass — using the app's own type and
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
    <section className="section-y bg-muted/30 border-border/60 border-b">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <p className="text-primary text-sm font-semibold">{t('eyebrow')}</p>
        <h2 className="font-display mt-2 max-w-xl text-xl text-balance sm:text-2xl">
          {t('title')}
        </h2>

        <div className="mt-8 grid items-center gap-8 sm:grid-cols-[minmax(0,1fr)_22rem] sm:gap-12">
          <ol className="flex flex-col gap-6">
            <li className="flex gap-4">
              <span className="text-secondary font-display text-2xl tabular-nums">01</span>
              <div>
                <p className="font-display text-lg">{t('animationStep1Title')}</p>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                  {t('messageCaption')}
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="text-secondary font-display text-2xl tabular-nums">02</span>
              <div>
                <p className="font-display text-lg">{t('animationStep2Title')}</p>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                  {t('animationStep2Body')}
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="text-secondary font-display text-2xl tabular-nums">03</span>
              <div>
                <p className="font-display text-lg">{t('animationStep3Title')}</p>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                  {t('passFigCaption')}
                </p>
              </div>
            </li>
          </ol>

          <figure className="border-foreground/15 bg-foreground relative mx-auto aspect-[9/16] w-full max-w-[22rem] overflow-hidden rounded-[2.75rem] border-[7px] p-3 shadow-2xl">
            <div className="bg-card relative h-full overflow-hidden rounded-[2.1rem]">
              <div className="border-border/70 flex h-14 items-center justify-between border-b px-5">
                <span className="text-muted-foreground text-xs">9:41</span>
                <span className="font-display flex items-center gap-1.5 text-sm">
                  <BrandMark className="size-4" />
                  {t('passBrand')}
                </span>
              </div>

              <div className="journey-screen journey-invite absolute inset-x-0 top-14 bottom-0 flex flex-col justify-center p-4">
                <div className="bg-background rounded-2xl border p-4 shadow-sm">
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
                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  <span className="border-border text-primary flex items-center justify-center gap-1 rounded-lg border py-2 text-xs font-medium">
                    <CheckIcon className="size-3.5" />
                    {t('replyYes')}
                  </span>
                  <span className="border-border text-muted-foreground flex items-center justify-center gap-1 rounded-lg border py-2 text-xs font-medium">
                    <XIcon className="size-3.5" />
                    {t('replyNo')}
                  </span>
                  <span className="border-border text-secondary flex items-center justify-center gap-1 rounded-lg border py-2 text-xs font-medium">
                    <MapPinIcon className="size-3.5" />
                    {t('replyLocation')}
                  </span>
                </div>
              </div>

              <div className="journey-screen journey-confirm absolute inset-x-0 top-14 bottom-0 flex flex-col items-center justify-center px-6 text-center">
                <span className="bg-secondary/12 text-secondary ring-secondary/25 flex size-16 items-center justify-center rounded-full ring-1">
                  <CheckIcon className="size-8" />
                </span>
                <p className="font-display mt-5 text-2xl">{t('animationConfirmedTitle')}</p>
                <p className="text-muted-foreground mt-2 text-sm">{t('animationConfirmedBody')}</p>
              </div>

              <div className="journey-screen journey-pass absolute inset-x-0 top-14 bottom-0 flex flex-col items-center justify-center px-6 text-center">
                <BrandMark className="size-7" />
                <p className="font-display mt-3 text-2xl">{t('passTitle')}</p>
                <div
                  aria-hidden
                  className="border-foreground/15 mt-5 grid size-36 grid-cols-6 gap-0.5 rounded-lg border bg-white p-2"
                >
                  {QR_PATTERN.map((filled, i) => (
                    <span
                      key={i}
                      className={filled ? 'bg-foreground rounded-[1px]' : 'bg-transparent'}
                    />
                  ))}
                </div>
                <p className="text-muted-foreground mt-4 text-xs">{t('passCaption')}</p>
              </div>
            </div>
            <figcaption className="sr-only">
              {t('messageCaption')} {t('passFigCaption')}
            </figcaption>
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
