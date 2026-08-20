import { forwardRef } from 'react';
import { useTranslations } from 'next-intl';
import { BrandMark } from '@/components/brand-mark';

/**
 * The editable content + look of a template-generated cover — shared by
 * both designs below so the editor UI (color swatches, text fields) only
 * has to be built once. Not every field means the same thing on every
 * template (`subtitle` is a parents/blessing line on the classic design,
 * a feature-row caption on the floral one) — each template maps the
 * shared fields into its own layout rather than the layouts sharing
 * markup, since the two are meant to look nothing alike.
 */
export type WeddingCardData = {
  eyebrow: string;
  title: string;
  subtitle: string;
  dateText: string;
  timeText: string;
  locationText: string;
  backgroundColor: string;
  accentColor: string;
  textColor: string;
};

export const WEDDING_TEMPLATE_IDS = ['floral', 'classic'] as const;
export type WeddingTemplateId = (typeof WEDDING_TEMPLATE_IDS)[number];

// Real Saudi/Gulf invitation cards — رجالي and نسائي alike — are almost
// always the same tall "story" shape (checked against actual designs from
// a real invitation studio, not guessed): what tells them apart is tone
// and color, not aspect ratio. A landscape رجالي card was a wrong guess
// at that convention; both are 1080x1920 now, the same shape a phone
// screen or a WhatsApp status already is.
export const WEDDING_TEMPLATE_DIMENSIONS: Record<
  WeddingTemplateId,
  { width: number; height: number }
> = {
  floral: { width: 1080, height: 1920 },
  classic: { width: 1080, height: 1920 },
};

// Curated background/accent/text triples for the color picker. `mahalli`
// mirrors the site's own --primary/--secondary/--background tokens and is
// نسائي's default; `formalDark` mirrors the site's own dark --foreground
// tone with a warm gold accent and is رجالي's default — real men's cards
// read dark-and-formal, women's read light-and-decorative, so the two
// defaults are deliberately different even though both stay selectable
// for either template. The middle three stay as extra alternate looks.
export const WEDDING_PALETTES: Array<{
  id: string;
  backgroundColor: string;
  accentColor: string;
  textColor: string;
}> = [
  { id: 'mahalli', backgroundColor: '#f6efdc', accentColor: '#96471f', textColor: '#382616' },
  { id: 'blush', backgroundColor: '#f7ecec', accentColor: '#b96b7a', textColor: '#4a2f33' },
  { id: 'ivoryGold', backgroundColor: '#f5eee0', accentColor: '#a9824f', textColor: '#3d3222' },
  { id: 'sage', backgroundColor: '#eef1e6', accentColor: '#6b7d52', textColor: '#333d26' },
  { id: 'dusk', backgroundColor: '#eef0f3', accentColor: '#3d6576', textColor: '#26333a' },
  { id: 'formalDark', backgroundColor: '#2b1c10', accentColor: '#c9924f', textColor: '#f6efdc' },
];

export function defaultWeddingCardData(templateId: WeddingTemplateId): WeddingCardData {
  const palette = templateId === 'floral' ? WEDDING_PALETTES[0]! : WEDDING_PALETTES[5]!;
  if (templateId === 'floral') {
    return {
      eyebrow: 'بكل الحب نتشرف بدعوتكم',
      title: 'سارة & محمد',
      subtitle: 'حفل زواجنا',
      dateText: 'الخميس ١٦ يوليو ٢٠٢٦',
      timeText: 'من الساعة ٨:٠٠ م',
      locationText: 'قاعة الأفراح — الرياض',
      ...palette,
    };
  }
  return {
    eyebrow: 'بكل الحب والسرور',
    title: 'زواج سارة ومحمد',
    subtitle: 'يتشرف الوالدان بدعوتكم لحضور حفل الزواج',
    dateText: 'الخميس ١٦ يوليو ٢٠٢٦هـ',
    timeText: 'بعد صلاة العشاء',
    locationText: 'قاعة الأفراح — الرياض',
    ...palette,
  };
}

/**
 * Floral / feminine — tall portrait card, warm cream ground by default,
 * rust floral corner line-art, a diamond-motif border band top and
 * bottom (the site's own brand-mark shape, not a generic flourish), the
 * couple's names as the one large accent-colored line, and a boxed
 * three-item fact row for date/location/time. Ends in the same مهلّي
 * credit line as the classic design below.
 */
export const FloralWeddingTemplate = forwardRef<HTMLDivElement, { data: WeddingCardData }>(
  function FloralWeddingTemplate({ data }, ref) {
    const { width, height } = WEDDING_TEMPLATE_DIMENSIONS.floral;
    return (
      <div
        ref={ref}
        style={{
          width,
          height,
          background: `linear-gradient(160deg, ${data.backgroundColor} 0%, color-mix(in srgb, ${data.backgroundColor}, white 30%) 100%)`,
          color: data.textColor,
          fontFamily: 'var(--font-amiri), serif',
          position: 'relative',
          overflow: 'hidden',
          direction: 'rtl',
        }}
      >
        <FloralCorner color={data.accentColor} corner="top-start" />
        <FloralCorner color={data.accentColor} corner="bottom-end" />

        <div style={{ position: 'absolute', top: 88, insetInline: 90 }}>
          <DiamondBand id="floral-band-top" color={data.accentColor} width={width - 180} />
        </div>
        <div style={{ position: 'absolute', bottom: 150, insetInline: 90 }}>
          <DiamondBand id="floral-band-bottom" color={data.accentColor} width={width - 180} />
        </div>

        <div
          style={{
            position: 'absolute',
            top: 200,
            bottom: 240,
            insetInline: 96,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-evenly',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 32, opacity: 0.85, margin: 0 }}>{data.eyebrow}</p>

          <h1
            style={{
              fontSize: 108,
              fontWeight: 700,
              color: data.accentColor,
              margin: 0,
              lineHeight: 1.25,
            }}
          >
            {data.title}
          </h1>

          <p style={{ fontSize: 36, margin: 0 }}>{data.subtitle}</p>

          <DiamondDivider color={data.accentColor} />

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 20,
            }}
          >
            <CardFact
              label="التاريخ"
              value={data.dateText}
              color={data.accentColor}
              textColor={data.textColor}
            />
            <CardFact
              label="الموقع"
              value={data.locationText}
              color={data.accentColor}
              textColor={data.textColor}
            />
            <CardFact
              label="الوقت"
              value={data.timeText}
              color={data.accentColor}
              textColor={data.textColor}
            />
          </div>
        </div>

        <CardCredit textColor={data.textColor} />
      </div>
    );
  },
);

/**
 * Classical / formal — the same tall portrait shape as the floral design
 * (real رجالي and نسائي cards are the same shape; tone is what tells them
 * apart), dark ground with a warm gold accent by default, a double-line
 * inset frame with small diamond corner accents, the same diamond border
 * band top and bottom, and the invitation read as one formal block of
 * centered prose. Ends in the same مهلّي credit line as the floral design
 * above.
 */
export const ClassicWeddingTemplate = forwardRef<HTMLDivElement, { data: WeddingCardData }>(
  function ClassicWeddingTemplate({ data }, ref) {
    const { width, height } = WEDDING_TEMPLATE_DIMENSIONS.classic;
    return (
      <div
        ref={ref}
        style={{
          width,
          height,
          backgroundColor: data.backgroundColor,
          color: data.textColor,
          fontFamily: 'var(--font-amiri), serif',
          position: 'relative',
          direction: 'rtl',
        }}
      >
        <div style={{ position: 'absolute', inset: 48, border: `2px solid ${data.accentColor}` }} />
        <div
          style={{
            position: 'absolute',
            inset: 64,
            border: `1px solid ${data.accentColor}`,
          }}
        />
        {[
          { top: 40, insetInlineStart: 40 },
          { top: 40, insetInlineEnd: 40 },
          { bottom: 40, insetInlineStart: 40 },
          { bottom: 40, insetInlineEnd: 40 },
        ].map((pos, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              width: 16,
              height: 16,
              background: data.accentColor,
              transform: 'rotate(45deg)',
              ...pos,
            }}
          />
        ))}

        <div style={{ position: 'absolute', top: 100, insetInline: 100 }}>
          <DiamondBand id="classic-band-top" color={data.accentColor} width={width - 200} />
        </div>
        <div style={{ position: 'absolute', bottom: 160, insetInline: 100 }}>
          <DiamondBand id="classic-band-bottom" color={data.accentColor} width={width - 200} />
        </div>

        <div
          style={{
            position: 'absolute',
            top: 220,
            bottom: 260,
            insetInline: 130,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-evenly',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 30, margin: 0, color: data.accentColor }}>{data.eyebrow}</p>

          <h1
            style={{
              fontSize: 68,
              fontWeight: 700,
              margin: 0,
              lineHeight: 1.35,
            }}
          >
            {data.title}
          </h1>

          <p style={{ fontSize: 30, margin: 0, lineHeight: 1.6, maxWidth: 720 }}>{data.subtitle}</p>

          <DiamondDivider color={data.accentColor} />

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 20,
            }}
          >
            <CardFact
              label="التاريخ"
              value={data.dateText}
              color={data.accentColor}
              textColor={data.textColor}
            />
            <CardFact
              label="الوقت"
              value={data.timeText}
              color={data.accentColor}
              textColor={data.textColor}
            />
            <CardFact
              label="الموقع"
              value={data.locationText}
              color={data.accentColor}
              textColor={data.textColor}
            />
          </div>
        </div>

        <CardCredit textColor={data.textColor} />
      </div>
    );
  },
);

export const WEDDING_TEMPLATE_COMPONENTS: Record<WeddingTemplateId, typeof FloralWeddingTemplate> =
  {
    floral: FloralWeddingTemplate,
    classic: ClassicWeddingTemplate,
  };

// A boxed fact — rounded card in a soft tint of the card's own accent
// color, a small diamond bullet beside the label (the brand-mark shape
// again, not a generic pin/calendar icon), the value beneath. Real
// invitation cards box their date/time/location facts like this rather
// than running them as plain stacked text.
function CardFact({
  label,
  value,
  color,
  textColor,
}: {
  label: string;
  value: string;
  color: string;
  textColor: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        minWidth: 200,
        padding: '20px 24px',
        borderRadius: 18,
        background: `color-mix(in srgb, ${color}, transparent 90%)`,
        border: `1px solid color-mix(in srgb, ${color}, transparent 65%)`,
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 22,
          color,
          fontWeight: 700,
        }}
      >
        <span
          aria-hidden
          style={{
            display: 'inline-block',
            width: 9,
            height: 9,
            background: color,
            transform: 'rotate(45deg)',
          }}
        />
        {label}
      </span>
      <span style={{ fontSize: 26, color: textColor, maxWidth: 260 }}>{value}</span>
    </div>
  );
}

// The مهلّي credit line — same brand mark and wordmark colors as the rest
// of the site (not the card's own customizable accentColor), since this
// is a signature of who made the card, not part of the couple's own
// content. Sits low and quiet (reduced opacity, small size) rather than
// competing with the invitation itself for attention.
function CardCredit({ textColor }: { textColor: string }) {
  const t = useTranslations('Brand');
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 50,
        insetInline: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        opacity: 0.6,
      }}
    >
      <BrandMark style={{ width: 24, height: 24 }} />
      <span style={{ fontSize: 24, color: textColor, fontFamily: 'var(--font-amiri), serif' }}>
        {t('name')}
      </span>
    </div>
  );
}

// A small mid-card divider — hairline, diamond, hairline — marking the
// transition from the couple's names/blessing block to the date/time/
// location facts, the same way a real card breaks those two sections
// with a rule rather than running straight from one into the other.
function DiamondDivider({ color }: { color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }} aria-hidden>
      <span style={{ width: 64, height: 1, background: color, opacity: 0.6 }} />
      <span
        style={{
          width: 10,
          height: 10,
          background: color,
          transform: 'rotate(45deg)',
        }}
      />
      <span style={{ width: 64, height: 1, background: color, opacity: 0.6 }} />
    </div>
  );
}

// A thin repeating-diamond band bounded by two hairlines — the same
// diamond shape as the brand mark, tiled, standing in for the geometric
// border strips real invitation cards use rather than copying their
// specific pattern.
function DiamondBand({ id, color, width }: { id: string; color: string; width: number }) {
  return (
    <svg width={width} height={40} viewBox={`0 0 ${width} 40`} aria-hidden>
      <defs>
        <pattern id={id} width="52" height="40" patternUnits="userSpaceOnUse">
          <rect
            x="13"
            y="13"
            width="14"
            height="14"
            fill={color}
            opacity="0.75"
            transform="rotate(45 20 20)"
          />
        </pattern>
      </defs>
      <line x1="0" y1="6" x2={width} y2="6" stroke={color} strokeWidth="1.5" opacity="0.55" />
      <rect x="0" y="0" width={width} height="40" fill={`url(#${id})`} />
      <line x1="0" y1="34" x2={width} y2="34" stroke={color} strokeWidth="1.5" opacity="0.55" />
    </svg>
  );
}

function FloralCorner({ color, corner }: { color: string; corner: 'top-start' | 'bottom-end' }) {
  const isTop = corner === 'top-start';
  return (
    <svg
      width="340"
      height="340"
      viewBox="0 0 260 260"
      style={{
        position: 'absolute',
        top: isTop ? -40 : undefined,
        left: isTop ? -40 : undefined,
        bottom: isTop ? undefined : -40,
        right: isTop ? undefined : -40,
        transform: isTop ? undefined : 'rotate(180deg)',
        opacity: 0.55,
      }}
      aria-hidden
    >
      <g fill="none" stroke={color} strokeWidth="1.5">
        <path d="M40 220 Q 40 120 140 90 Q 220 65 220 40" />
        <path d="M60 210 Q 70 130 150 105" />
      </g>
      {[
        [70, 200, 16],
        [95, 165, 22],
        [130, 130, 26],
        [170, 100, 18],
        [200, 70, 14],
        [55, 150, 10],
        [110, 190, 11],
      ].map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={color} opacity={0.18 + (i % 3) * 0.08} />
      ))}
    </svg>
  );
}
