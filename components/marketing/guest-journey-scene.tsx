'use client';

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

export function GuestJourneyScene({ copy }: { copy: Copy }) {
  const invitation = defaultWeddingCardData('square');
  const actions: Array<[string, typeof CheckIcon]> = [
    [copy.accept, CheckIcon],
    [copy.decline, XIcon],
    [copy.location, MapPinIcon],
  ];

  return (
    <figure className="relative mt-8 aspect-[3/4] overflow-hidden rounded-[2rem] border border-black/10 bg-[url('/images/marketing/iphone-guest-journey.png')] bg-cover bg-[position:52%_center] bg-no-repeat shadow-xl sm:aspect-[4/3] sm:bg-center">
      <div className="absolute inset-0 bg-gradient-to-r from-[#f6efdc]/15 via-transparent to-black/5" />

      {/* The photographed iPhone is the frame. Only this clipped layer is
          animated, aligned over its blank screen so the hand, reflections,
          bezel and camera stay photographic and convincing.

          These numbers come from the photo itself, not a guess: scanned
          the actual pixels of iphone-guest-journey.png for the screen's
          white-to-bezel boundary and took the four axis-extreme points of
          that rounded rect — (499,342) (660,293) (777,691) (611,757) in
          the original 1448×1086 image. Those four points are exactly the
          corners a straight-edged clip-path polygon needs for a rotated
          rounded rectangle: the chords between them stay inside the true
          curve everywhere except at the corners themselves, so it can
          never bleed onto the bezel.

          top/height are the same fraction at both breakpoints because
          neither background-size crops the image vertically (mobile's
          `cover` scales to match height exactly, same as sm's `cover` on
          a container whose aspect ratio already equals the photo's).
          left/width differ because mobile's `cover` DOES crop
          horizontally (bg-position 52% decides which slice survives),
          so the box has to be re-expressed in the cropped, not the full,
          coordinate space — verified against the same pixels before this
          was written, not assumed. */}
      <div
        className="absolute top-[27%] left-[20.8%] z-10 h-[42.7%] w-[34.1%] overflow-hidden sm:left-[34.5%] sm:w-[19.2%]"
        style={{ clipPath: 'polygon(0 10.6%, 57.9% 0, 100% 85.8%, 40.3% 100%)' }}
      >
        {/* The clip above gets the screen's OUTLINE right; this layer gets
            its ORIENTATION right. Without it the chat sat perfectly level
            inside a phone tilted 16 degrees, which is exactly what read as
            "crooked" — the outline matched but the content didn't follow it.

            The photo's screen edges give the angle: its top edge runs
            (499,342)->(660,293), i.e. -16.9 degrees, and its left edge
            (499,342)->(611,757), i.e. -15.1 degrees from vertical. Those
            differ because the shot has real perspective (the bottom edge
            measures 178px against the top's 168px), which a single
            rotation cannot reproduce — so this splits them at -16deg and
            lets the clip absorb the remainder. The layer is deliberately
            oversized past the box on every side so that remainder can only
            ever be trimmed away, never leave a sliver of bare screen. */}
        <div
          className="absolute top-[-3%] left-[12%] h-[106%] w-[75%] bg-[#efeae2] text-[#111b21]"
          style={{ transform: 'rotate(-16deg)' }}
        >
          <div
            className="absolute inset-x-0 top-0 flex h-[15%] items-center gap-[3%] border-b border-black/10 bg-[#f7f8fa] px-[5%]"
            dir="ltr"
          >
            <span className="text-[#007aff]">‹</span>
            <span className="flex aspect-square h-[70%] items-center justify-center rounded-full bg-[#f6efdc]">
              <BrandMark className="h-[55%] w-[55%]" />
            </span>
            <strong className="min-w-0 flex-1 truncate text-[5px] sm:text-[7px]">
              {copy.chatName}
            </strong>
            <VideoIcon className="h-[25%] w-auto text-[#007aff]" />
            <PhoneIcon className="h-[25%] w-auto text-[#007aff]" />
          </div>
          <div className="whatsapp-wallpaper absolute inset-x-0 top-[15%] bottom-[9%]" />

          <div className="journey-screen journey-invite absolute inset-x-[5%] top-[17%] bottom-[11%] flex items-center">
            <div className="w-full overflow-hidden rounded-[5px] bg-white shadow-sm" dir="rtl">
              <div className="relative aspect-square w-full overflow-hidden bg-[#f6efdc]">
                <div className="absolute top-0 left-0 origin-top-left scale-[0.078] sm:scale-[0.12]">
                  <SquareWeddingTemplate data={invitation} />
                </div>
              </div>
              <p className="px-[5%] py-[3%] text-[4px] leading-relaxed sm:text-[5px]">
                {copy.invitationText}
              </p>
              <div className="border-t border-[#e4e7e9]">
                {actions.map(([label, Icon]) => (
                  <div
                    key={String(label)}
                    className="flex h-[14px] items-center justify-center gap-0.5 border-b border-[#e4e7e9] text-[4px] font-bold text-[#00a884] last:border-0 sm:h-[18px] sm:text-[5px]"
                  >
                    <Icon className="size-[5px] sm:size-[7px]" />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            className="journey-screen journey-confirm absolute inset-x-[7%] top-[20%] bottom-[11%] flex flex-col justify-center gap-[5%]"
            dir="rtl"
          >
            <div className="mr-auto max-w-[72%] rounded-[5px] rounded-tr-none bg-[#d9fdd3] px-[7%] py-[5%] text-right shadow-sm">
              <p className="text-[6px] font-semibold sm:text-[8px]">{copy.confirmationReply}</p>
              <p className="mt-[3%] text-left text-[3px] text-[#667781] sm:text-[4px]">١٢:٢٥ ✓✓</p>
            </div>
            <div className="ml-auto max-w-[88%] rounded-[5px] rounded-tl-none bg-white px-[7%] py-[6%] text-right shadow-sm">
              <p className="text-[5px] leading-relaxed sm:text-[7px]">{copy.confirmationReceipt}</p>
              <p className="mt-[3%] text-left text-[3px] text-[#667781] sm:text-[4px]">١٢:٢٥</p>
            </div>
          </div>

          <div className="journey-screen journey-pass absolute inset-x-[7%] top-[17%] bottom-[11%] flex items-center">
            <div
              className="w-full overflow-hidden rounded-[5px] bg-white p-[2px] text-center shadow-sm"
              dir="rtl"
            >
              <Image
                src="/images/marketing/entry-pass-example.png"
                width={1024}
                height={1536}
                alt={`${copy.passTitle} — ${copy.passCaption}`}
                className="h-auto w-full rounded-[4px]"
              />
            </div>
          </div>

          <div
            className="absolute inset-x-0 bottom-0 flex h-[9%] items-center gap-[3%] bg-[#f7f8fa] px-[4%]"
            dir="ltr"
          >
            <span className="flex-1 rounded-full bg-white text-right text-[4px] text-[#aeb5ba] ring-1 ring-[#d9dde1]">
              &nbsp;
            </span>
            <CameraIcon className="h-[35%] w-auto text-[#667781]" />
            <span className="flex aspect-square h-[68%] items-center justify-center rounded-full bg-[#00a884] text-white">
              <MicIcon className="h-[48%] w-[48%]" />
            </span>
          </div>
        </div>
      </div>
      <figcaption className="sr-only">
        {[copy.invitationText, copy.confirmationReceipt, copy.passCaption].join(' ')}
      </figcaption>
    </figure>
  );
}
