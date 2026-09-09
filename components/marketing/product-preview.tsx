import { getTranslations } from 'next-intl/server';
import { BrandMark } from '@/components/brand-mark';
import {
  BatteryFullIcon,
  CameraIcon,
  CheckIcon,
  ChevronLeftIcon,
  MapPinIcon,
  MicIcon,
  PhoneIcon,
  PlusIcon,
  SignalIcon,
  VideoIcon,
  WifiIcon,
  XIcon,
} from 'lucide-react';

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

          <figure className="relative mx-auto aspect-[9/19.5] w-full max-w-[20rem] rounded-[3.4rem] border-[8px] border-[#171717] bg-[#171717] p-[5px] shadow-2xl ring-1 ring-black/20">
            <span className="absolute top-24 -right-[11px] h-20 w-[3px] rounded-r bg-[#303030]" />
            <span className="absolute top-28 -left-[11px] h-12 w-[3px] rounded-l bg-[#303030]" />
            <span className="absolute top-44 -left-[11px] h-16 w-[3px] rounded-l bg-[#303030]" />
            <div className="relative h-full overflow-hidden rounded-[2.75rem] bg-[#efeae2] text-[#111b21]">
              <div
                className="flex h-11 items-center justify-between bg-[#f7f8fa] px-5 pt-1 text-[10px] font-semibold"
                dir="ltr"
              >
                <span>9:41</span>
                <span className="flex items-center gap-1.5">
                  <SignalIcon className="size-3" />
                  <WifiIcon className="size-3" />
                  <BatteryFullIcon className="h-3 w-4" />
                </span>
              </div>
              <div className="flex h-14 items-center gap-2 bg-[#f7f8fa] px-3 shadow-sm" dir="ltr">
                <ChevronLeftIcon className="size-5 text-[#007aff]" />
                <span className="flex size-9 items-center justify-center rounded-full bg-[#f6efdc]">
                  <BrandMark className="size-5" />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <strong className="block truncate text-[13px] leading-4">{t('chatName')}</strong>
                </span>
                <VideoIcon className="size-4 text-[#007aff]" />
                <PhoneIcon className="size-4 text-[#007aff]" />
              </div>
              <div className="whatsapp-wallpaper absolute inset-x-0 top-[6.25rem] bottom-12" />

              <div className="journey-screen journey-invite absolute inset-x-0 top-[6.25rem] bottom-12 flex flex-col justify-center px-3 py-3">
                <div
                  className="w-[92%] self-end overflow-hidden rounded-xl rounded-tr-sm bg-white shadow-sm"
                  dir="rtl"
                >
                  <div className="m-1.5 flex aspect-square flex-col items-center justify-center rounded-lg border border-[#d8c9ad] bg-[#f6efdc] px-4 text-center">
                    <BrandMark className="size-6" />
                    <p className="font-display mt-3 text-lg text-[#382616]">{t('messageBody')}</p>
                    <span className="mt-3 h-px w-16 bg-[#96471f]/40" />
                    <p className="mt-3 text-[10px] leading-5 text-[#67564c]">{t('messageDate')}</p>
                    <p className="text-[10px] leading-5 text-[#67564c]">{t('messagePlace')}</p>
                  </div>
                  <div className="px-3 pt-1 pb-2">
                    <p className="text-[11px] leading-[1.65]">{t('chatInvitationText')}</p>
                    <p className="text-left text-[8px] text-[#667781]" dir="ltr">
                      12:33 AM
                    </p>
                  </div>
                  <div className="border-t border-[#e4e7e9]">
                    {[
                      [t('replyYes'), <CheckIcon key="yes" className="size-3.5" />],
                      [t('replyNo'), <XIcon key="no" className="size-3.5" />],
                      [t('replyLocation'), <MapPinIcon key="map" className="size-3.5" />],
                    ].map(([label, icon]) => (
                      <div
                        key={String(label)}
                        className="flex h-9 items-center justify-center gap-1.5 border-b border-[#e4e7e9] text-[11px] font-semibold text-[#00a884] last:border-0"
                      >
                        {icon}
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="journey-screen journey-confirm absolute inset-x-0 top-[6.25rem] bottom-12 flex flex-col justify-center px-3 py-3">
                <div
                  className="w-[88%] self-end rounded-xl rounded-tr-sm bg-white p-3 shadow-sm"
                  dir="rtl"
                >
                  <div className="flex items-start gap-2">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#d9fdd3] text-[#008069]">
                      <CheckIcon className="size-4" />
                    </span>
                    <div>
                      <p className="text-[12px] font-bold">{t('animationConfirmedTitle')}</p>
                      <p className="mt-1 text-[10px] leading-5 text-[#667781]">
                        {t('animationConfirmedBody')}
                      </p>
                    </div>
                  </div>
                  <p className="mt-1 text-left text-[8px] text-[#667781]" dir="ltr">
                    12:34 AM
                  </p>
                </div>
              </div>

              <div className="journey-screen journey-pass absolute inset-x-0 top-[6.25rem] bottom-12 flex flex-col justify-center px-3 py-3">
                <div
                  className="w-[88%] self-end overflow-hidden rounded-xl rounded-tr-sm bg-white shadow-sm"
                  dir="rtl"
                >
                  <div className="m-1.5 flex flex-col items-center rounded-lg bg-[#fffdf7] px-4 py-5 text-center ring-1 ring-[#dfd2ba]">
                    <BrandMark className="size-6" />
                    <p className="font-display mt-2 text-lg text-[#382616]">{t('passTitle')}</p>
                    <div
                      aria-hidden
                      className="mt-3 grid size-28 grid-cols-6 gap-0.5 rounded-md border border-black/15 bg-white p-2"
                    >
                      {QR_PATTERN.map((filled, i) => (
                        <span
                          key={i}
                          className={filled ? 'rounded-[1px] bg-[#111]' : 'bg-transparent'}
                        />
                      ))}
                    </div>
                    <p className="mt-3 text-[10px] text-[#667781]">{t('passCaption')}</p>
                  </div>
                  <p className="px-3 pb-2 text-left text-[8px] text-[#667781]" dir="ltr">
                    12:34 AM
                  </p>
                </div>
              </div>

              <div
                className="absolute inset-x-0 bottom-0 z-10 flex h-12 items-center gap-2 bg-[#f7f8fa] px-2"
                dir="ltr"
              >
                <PlusIcon className="size-5 shrink-0 text-[#007aff]" />
                <span className="flex h-8 min-w-0 flex-1 items-center justify-end rounded-full bg-white px-2 ring-1 ring-[#d9dde1]">
                  <CameraIcon className="size-4 text-[#667781]" />
                </span>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white">
                  <MicIcon className="size-4" />
                </span>
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
