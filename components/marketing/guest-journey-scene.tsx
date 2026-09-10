'use client';

import { useEffect, useRef } from 'react';
import { BrandMark } from '@/components/brand-mark';
import {
  SquareWeddingTemplate,
  defaultWeddingCardData,
} from '@/components/public/wedding-invitation-templates';
import Image from 'next/image';
import {
  CameraIcon,
  CheckIcon,
  MapPinIcon,
  MicIcon,
  PhoneIcon,
  VideoIcon,
  XIcon,
} from 'lucide-react';

type Copy = {
  chatName: string;
  invitationText: string;
  accept: string;
  decline: string;
  location: string;
  confirmationReply: string;
  confirmationReceipt: string;
  passTitle: string;
  passCaption: string;
};

/** The photograph's own pixel dimensions — every coordinate here is in them. */
const PHOTO_W = 1448;
const PHOTO_H = 1086;

/**
 * How much closer the crop sits than "fit the whole photo in the frame".
 * The photograph is a wide scene and the phone is a small part of it; at
 * 1.0 the chat was legible only if you leaned in. This trims a slice off
 * the man on the right and off the marble at the bottom — neither of
 * which is what the section is about — and gives that room to the screen.
 */
const CROP_ZOOM = 1.34;

/**
 * Maps a real 390×844 iPhone screen onto the screen in the photograph.
 *
 * Solved as a projective transform, not a rotation, because the screen in
 * the photo is a trapezoid: its bottom edge measures 178px against the
 * top's 168px. A rotation keeps a rectangle a rectangle, so it can match
 * the tilt or the edges but never both — the earlier attempt had to be
 * oversized to cover the corners, which pushed the header and the input
 * bar off the screen entirely. That displacement is what read as crooked.
 *
 * The four corners came from scanning the photo for its white-to-bezel
 * boundary, then fitted to it: the corners were nudged until the quad's
 * overlap with the scanned screen region stopped improving, which lands at
 * (493,329) (680,288) (781,712) (600,764) and 97.7% agreement — the rest is
 * the screen's rounded corners, which `rounded-[54px]` below cuts to match.
 * Reading the corners off by eye left a hairline of bare photo down one
 * side and spilled over the bezel on the other.
 *
 * This matrix maps the screen's own corners onto those points, so the
 * header sits on the top edge and the input bar on the bottom edge, the
 * way they would if the phone were really running the app.
 */
const SCREEN_TRANSFORM =
  'matrix3d(0.528459,-0.0843872,0,0.0000720173,0.139201,0.531223,0,0.0000207067,0,0,1,0,493,329,0,1)';

/**
 * Cellular, Wi-Fi and battery, drawn rather than typed. Box-drawing
 * characters render at a different weight in every font and were the one
 * detail on the screen that gave the mockup away.
 */
function StatusIndicators() {
  return (
    <span className="flex items-end gap-[5px] text-[#111b21]" dir="ltr">
      <svg viewBox="0 0 17 11" className="h-[11px] w-[17px]" fill="currentColor" aria-hidden="true">
        <rect x="0" y="7.5" width="3" height="3.5" rx="1" />
        <rect x="4.7" y="5" width="3" height="6" rx="1" />
        <rect x="9.4" y="2.5" width="3" height="8.5" rx="1" />
        <rect x="14.1" y="0" width="3" height="11" rx="1" />
      </svg>
      <svg viewBox="0 0 16 12" className="h-[11px] w-[15px]" fill="currentColor" aria-hidden="true">
        <path d="M8 11.4 5.4 8.6a3.8 3.8 0 0 1 5.2 0Z" />
        <path d="M8 6.2a6.2 6.2 0 0 0-4.4 1.8L1.9 6.2a8.6 8.6 0 0 1 12.2 0L12.4 8A6.2 6.2 0 0 0 8 6.2Z" />
        <path d="M8 1.6c3 0 5.7 1.2 7.7 3.1l-1.2 1.2a9.2 9.2 0 0 0-13 0L.3 4.7A10.9 10.9 0 0 1 8 1.6Z" />
      </svg>
      <svg viewBox="0 0 27 12" className="h-[11px] w-[25px]" aria-hidden="true">
        <rect
          x="0.5"
          y="0.5"
          width="23"
          height="11"
          rx="3.4"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.4"
        />
        <rect x="2" y="2" width="17" height="8" rx="2.1" fill="currentColor" />
        <path d="M25 4.2a2.4 2.4 0 0 1 0 3.6Z" fill="currentColor" fillOpacity="0.4" />
      </svg>
    </span>
  );
}

export function GuestJourneyScene({ copy, locale }: { copy: Copy; locale: string }) {
  const frameRef = useRef<HTMLElement>(null);
  // The mockup is a screenshot of the guest's own phone, so its chrome
  // follows the guest's language: an English reader sees an English
  // WhatsApp, left to right, with Western digits.
  const rtl = locale === 'ar';
  const clock = (value: string) =>
    rtl ? value.replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]) : value;
  const invitation = defaultWeddingCardData('square');
  const actions: Array<[string, typeof CheckIcon]> = [
    [copy.accept, CheckIcon],
    [copy.decline, XIcon],
    [copy.location, MapPinIcon],
  ];

  /**
   * The stage holds the photo at its native size so everything inside can
   * be placed in the photo's own pixels — including the matrix above,
   * whose perspective terms are per-pixel and would otherwise need
   * recomputing for every viewport. One uniform scale on the stage keeps
   * that mapping correct at any size.
   *
   * Measured rather than written in container units because CSS cannot
   * divide one length by another to get the unitless number scale() needs.
   */
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const apply = () => {
      const { width, height } = frame.getBoundingClientRect();
      if (!width || !height) return;
      // `cover`, then closer: fill the frame on both axes, then zoom in
      // on the phone. Where that lands is set in CSS, which anchors the
      // stage on the point in the photo the phone sits at.
      const cover = Math.max(width / PHOTO_W, height / PHOTO_H);
      frame.style.setProperty('--stage-scale', String(cover * CROP_ZOOM));
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const bubble = 'rounded-[10px] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]';
  const stamp = 'mt-1 text-[11px] leading-none text-[#667781]';

  return (
    <figure
      ref={frameRef}
      className="phone-frame relative mt-8 aspect-[3/4] overflow-hidden rounded-[2rem] border border-black/10 shadow-xl sm:aspect-[4/3]"
    >
      <div className="phone-stage">
        <Image
          src="/images/marketing/iphone-guest-journey.png"
          alt=""
          width={PHOTO_W}
          height={PHOTO_H}
          priority
          className="block h-[1086px] w-[1448px] max-w-none"
        />

        <div
          dir={rtl ? 'rtl' : 'ltr'}
          className="absolute top-0 left-0 h-[844px] w-[390px] origin-top-left overflow-hidden rounded-[54px] bg-[#efeae2] text-[#111b21]"
          style={{ transform: SCREEN_TRANSFORM }}
        >
          <header className="absolute inset-x-0 top-0 h-[108px] bg-[#f7f8fa]">
            <div className="flex h-[54px] items-end justify-between px-7 pb-1.5">
              <span className="text-[15px] font-semibold">{clock('12:26')}</span>
              <StatusIndicators />
            </div>
            <div className="flex h-[54px] items-center gap-2.5 border-b border-black/10 px-3">
              <span className="text-[26px] leading-none text-[#007aff]">{rtl ? '›' : '‹'}</span>
              <span className="flex size-[38px] items-center justify-center rounded-full bg-[#f6efdc]">
                <BrandMark className="size-[22px]" />
              </span>
              <strong className="flex-1 text-[17px] leading-tight font-semibold">
                {copy.chatName}
              </strong>
              <VideoIcon className="size-[22px] text-[#007aff]" />
              <PhoneIcon className="size-[20px] text-[#007aff]" />
            </div>
          </header>

          <div className="whatsapp-wallpaper absolute inset-x-0 top-[108px] bottom-[76px]" />

          <div className="journey-screen journey-invite absolute inset-x-3 top-[108px] bottom-[76px] flex items-center">
            <div className={`me-auto w-[285px] overflow-hidden bg-white ${bubble}`}>
              <div className="relative aspect-square w-full overflow-hidden bg-[#f6efdc]">
                <div className="absolute top-0 left-0 origin-top-left scale-[0.2639]">
                  <SquareWeddingTemplate data={invitation} />
                </div>
              </div>
              <p className="px-3 pt-2 pb-1.5 text-[14.5px] leading-[21px]">
                {copy.invitationText}
                <span className={`ms-2 ${rtl ? 'float-left' : 'float-right'} ${stamp}`}>
                  {clock('12:20')}
                </span>
              </p>
              <div className="border-t border-[#e9edef]">
                {actions.map(([label, Icon]) => (
                  <div
                    key={String(label)}
                    className="flex h-[42px] items-center justify-center gap-1.5 border-b border-[#e9edef] text-[15px] font-medium text-[#00a884] last:border-0"
                  >
                    <Icon className="size-[15px]" />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="journey-screen journey-confirm absolute inset-x-3 top-[108px] bottom-[76px] flex flex-col justify-center gap-2">
            <div className={`ms-auto max-w-[70%] bg-[#d9fdd3] px-3 py-2 ${bubble}`}>
              <p className="text-[15px] leading-[20px]">{copy.confirmationReply}</p>
              <p className={`${rtl ? 'text-left' : 'text-right'} ${stamp}`}>{clock('12:25')} ✓✓</p>
            </div>
            <div className={`me-auto max-w-[85%] bg-white px-3 py-2 ${bubble}`}>
              <p className="text-[15px] leading-[21px]">{copy.confirmationReceipt}</p>
              <p className={`${rtl ? 'text-left' : 'text-right'} ${stamp}`}>{clock('12:25')}</p>
            </div>
          </div>

          <div className="journey-screen journey-pass absolute inset-x-3 top-[108px] bottom-[76px] flex items-center">
            <div className={`me-auto w-[285px] overflow-hidden bg-white p-1.5 ${bubble}`}>
              <Image
                src="/images/marketing/entry-pass-example.png"
                width={1024}
                height={1536}
                alt={`${copy.passTitle} — ${copy.passCaption}`}
                className="h-auto w-full rounded-[6px]"
              />
              <p className={`px-1 pt-1 ${rtl ? 'text-left' : 'text-right'} ${stamp}`}>
                {clock('12:26')}
              </p>
            </div>
          </div>

          <footer className="absolute inset-x-0 bottom-0 h-[76px] px-2.5">
            <div className="flex h-[52px] items-center gap-2">
              <span className="h-[40px] flex-1 rounded-full bg-white ring-1 ring-black/5" />
              <CameraIcon className="size-[22px] text-[#54656f]" />
              <span className="flex size-[40px] items-center justify-center rounded-full bg-[#00a884] text-white">
                <MicIcon className="size-[20px]" />
              </span>
            </div>
            <span className="mx-auto block h-[5px] w-[134px] rounded-full bg-[#111b21]/85" />
          </footer>
        </div>
      </div>

      <figcaption className="sr-only">
        {[copy.invitationText, copy.confirmationReceipt, copy.passCaption].join(' ')}
      </figcaption>
    </figure>
  );
}
