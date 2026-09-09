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
  step1Title: string;
  step1Body: string;
  step2Title: string;
  step2Body: string;
  step3Title: string;
  step3Body: string;
  chatName: string;
  invitationText: string;
  accept: string;
  decline: string;
  location: string;
  confirmedTitle: string;
  passTitle: string;
  passCaption: string;
};

export function GuestJourneyScene({ copy }: { copy: Copy }) {
  const invitation = defaultWeddingCardData('square');
  const steps = [
    [copy.step1Title, copy.step1Body],
    [copy.step2Title, copy.step2Body],
    [copy.step3Title, copy.step3Body],
  ];
  const actions: Array<[string, typeof CheckIcon]> = [
    [copy.accept, CheckIcon],
    [copy.decline, XIcon],
    [copy.location, MapPinIcon],
  ];

  return (
    <figure className="relative mt-8 aspect-[3/4] overflow-hidden rounded-[2rem] border border-black/10 bg-[url('/images/marketing/iphone-guest-journey.png')] bg-[length:auto_100%] bg-[position:52%_center] bg-no-repeat shadow-xl sm:aspect-[4/3] sm:bg-cover sm:bg-center">
      <div className="absolute inset-0 bg-gradient-to-r from-[#f6efdc]/15 via-transparent to-black/5" />

      <ol className="absolute inset-x-3 bottom-3 z-20 grid gap-1.5 rounded-2xl bg-[#f6efdc]/90 p-3 shadow-lg backdrop-blur-sm sm:inset-x-auto sm:top-[11%] sm:bottom-auto sm:left-[3.5%] sm:w-[29%] sm:grid-cols-1 sm:gap-4 sm:p-5">
        {steps.map(([title, body], index) => (
          <li
            key={title}
            className="grid grid-cols-[2rem_1fr] gap-2 sm:grid-cols-[2.4rem_1fr] sm:gap-3"
          >
            <span className="font-display text-secondary text-lg tabular-nums sm:text-2xl">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span>
              <strong className="font-display block text-sm leading-tight text-[#382616] sm:text-lg">
                {title}
              </strong>
              <span className="mt-0.5 block text-[10px] leading-snug text-[#67564c] sm:text-xs sm:leading-relaxed">
                {body}
              </span>
            </span>
          </li>
        ))}
      </ol>

      {/* The photographed iPhone is the frame. Only this clipped layer is
          animated, aligned over its blank screen so the hand, reflections,
          bezel and camera stay photographic and convincing. */}
      <div
        className="absolute top-[30.2%] left-[30%] z-10 h-[39.2%] w-[24.5%] overflow-hidden bg-[#efeae2] text-[#111b21] sm:left-[35%] sm:w-[18%]"
        style={{ clipPath: 'polygon(0 5%, 72% 0, 100% 88%, 32% 100%)' }}
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
            <p className="text-[6px] font-semibold sm:text-[8px]">{copy.accept}</p>
            <p className="mt-[3%] text-left text-[3px] text-[#667781] sm:text-[4px]">١٢:٢٥ ✓✓</p>
          </div>
          <div className="ml-auto max-w-[88%] rounded-[5px] rounded-tl-none bg-white px-[7%] py-[6%] text-right shadow-sm">
            <p className="text-[5px] leading-relaxed sm:text-[7px]">
              {copy.confirmedTitle}: {copy.accept}. شكرًا لك!
            </p>
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
      <figcaption className="sr-only">{steps.map((step) => step.join(' ')).join(' ')}</figcaption>
    </figure>
  );
}
