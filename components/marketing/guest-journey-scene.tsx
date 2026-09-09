import { BrandMark } from '@/components/brand-mark';
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
  invitationDate: string;
  invitationPlace: string;
  invitationText: string;
  accept: string;
  decline: string;
  location: string;
  confirmedTitle: string;
  confirmedBody: string;
  passTitle: string;
  passCaption: string;
};

export function GuestJourneyScene({ copy }: { copy: Copy }) {
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
      <div className="absolute top-[28.5%] left-[20%] z-10 h-[40.5%] w-[34%] rotate-[-8deg] skew-y-[-1deg] overflow-hidden rounded-[13%] bg-[#efeae2] text-[#111b21] sm:left-[36.4%] sm:w-[15.3%]">
        <div
          className="absolute inset-x-0 top-[10%] flex h-[13%] items-center gap-[3%] border-b border-black/10 bg-[#f7f8fa] px-[5%]"
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
        <div className="whatsapp-wallpaper absolute inset-x-0 top-[23%] bottom-[8%]" />

        <div className="journey-screen journey-invite absolute inset-x-[5%] top-[25%] bottom-[10%] flex items-center">
          <div className="w-full overflow-hidden rounded-[5px] bg-white shadow-sm" dir="rtl">
            <div className="relative m-[2px] flex aspect-square flex-col items-center justify-center border-2 border-[#96471f] bg-[#f6efdc] px-[7%] text-center text-[#96471f]">
              <span className="absolute inset-[4%] border border-[#96471f]/70" />
              <p className="font-display relative text-[4px] leading-tight sm:text-[5px]">
                بارك الله لهما وبارك عليهما وجمع بينهما في خير
              </p>
              <p className="relative mt-[4%] text-[3px] sm:text-[4px]">
                يتشرف عبدالله محمد وخالد سالم
              </p>
              <p className="relative mt-[2%] text-[3px] sm:text-[4px]">بدعوتكم لحضور حفل زواج</p>
              <p className="font-display relative mt-[3%] text-[5px] sm:text-[7px]">
                محمد عبدالله ◆ خالد سالم
              </p>
              <span className="relative my-[4%] h-px w-[35%] bg-[#96471f]/50" />
              <p className="relative text-[3px] leading-relaxed sm:text-[4px]">
                {copy.invitationDate}
              </p>
              <p className="relative text-[3px] leading-relaxed sm:text-[4px]">
                {copy.invitationPlace}
              </p>
              <span className="relative mt-[4%] flex items-center gap-0.5">
                <BrandMark className="size-[5px] sm:size-[7px]" />
                <b className="font-display text-[4px] sm:text-[5px]">مهلّي</b>
              </span>
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

        <div className="journey-screen journey-confirm absolute inset-x-[7%] top-[25%] bottom-[10%] flex items-center">
          <div className="w-full rounded-[5px] bg-white p-[8%] text-center shadow-sm" dir="rtl">
            <span className="mx-auto flex aspect-square w-[22%] items-center justify-center rounded-full bg-[#d9fdd3] text-[#008069]">
              <CheckIcon className="h-[48%] w-[48%]" />
            </span>
            <p className="font-display mt-[7%] text-[7px] sm:text-[9px]">{copy.confirmedTitle}</p>
            <p className="mt-[3%] text-[4px] text-[#667781] sm:text-[5px]">{copy.confirmedBody}</p>
          </div>
        </div>

        <div className="journey-screen journey-pass absolute inset-x-[7%] top-[25%] bottom-[10%] flex items-center">
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
          className="absolute inset-x-0 bottom-0 flex h-[8%] items-center gap-[3%] bg-[#f7f8fa] px-[4%]"
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
