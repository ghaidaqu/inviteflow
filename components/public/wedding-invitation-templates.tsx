import { forwardRef } from 'react';

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

export const WEDDING_CARD_WIDTH = 750;
export const WEDDING_CARD_HEIGHT = 1200;

// Curated background/accent pairs rather than a bare color wheel for the
// primary picker — every pair here already reads as an intentional,
// legible combination (checked for contrast against `textColor`), so
// swapping between them can't produce something illegible the way two
// independently-chosen colors could. A native color input still sits
// beside these for real "أي لون أبيه" freedom.
export const WEDDING_PALETTES: Array<{
  id: string;
  backgroundColor: string;
  accentColor: string;
  textColor: string;
}> = [
  { id: 'blush', backgroundColor: '#f7ecec', accentColor: '#b96b7a', textColor: '#4a2f33' },
  { id: 'ivoryGold', backgroundColor: '#f5eee0', accentColor: '#a9824f', textColor: '#3d3222' },
  { id: 'sage', backgroundColor: '#eef1e6', accentColor: '#6b7d52', textColor: '#333d26' },
  { id: 'mahalli', backgroundColor: '#f6efdc', accentColor: '#96471f', textColor: '#382616' },
  { id: 'dusk', backgroundColor: '#eef0f3', accentColor: '#3d6576', textColor: '#26333a' },
];

export function defaultWeddingCardData(templateId: WeddingTemplateId): WeddingCardData {
  const palette = WEDDING_PALETTES[templateId === 'floral' ? 0 : 3]!;
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
 * Floral / feminine — soft blush ground, layered circle-and-petal corner
 * ornaments (drawn as plain SVG shapes rather than an illustration
 * asset, so there's nothing to source or license), the couple's names
 * as the one large accent-colored line, and a three-item icon row for
 * date/location/time echoing the reference card's layout.
 */
export const FloralWeddingTemplate = forwardRef<HTMLDivElement, { data: WeddingCardData }>(
  function FloralWeddingTemplate({ data }, ref) {
    return (
      <div
        ref={ref}
        style={{
          width: WEDDING_CARD_WIDTH,
          height: WEDDING_CARD_HEIGHT,
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

        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 28,
            padding: '0 72px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 26, opacity: 0.85, margin: 0 }}>{data.eyebrow}</p>

          <h1
            style={{
              fontSize: 88,
              fontWeight: 700,
              color: data.accentColor,
              margin: 0,
              lineHeight: 1.25,
            }}
          >
            {data.title}
          </h1>

          <p style={{ fontSize: 30, margin: 0 }}>{data.subtitle}</p>

          <div
            style={{
              marginTop: 24,
              display: 'flex',
              gap: 48,
              fontSize: 22,
              alignItems: 'flex-start',
            }}
          >
            <CardFact label="التاريخ" value={data.dateText} color={data.accentColor} />
            <CardFact label="الموقع" value={data.locationText} color={data.accentColor} />
            <CardFact label="الوقت" value={data.timeText} color={data.accentColor} />
          </div>
        </div>
      </div>
    );
  },
);

/**
 * Classical / formal — plain cream ground, a thin+thick double-line
 * frame (the "كرت نجد"-style border), and the invitation read as one
 * formal block of centered prose rather than separated fields — this is
 * the register a lot of Gulf wedding cards are actually written in.
 */
export const ClassicWeddingTemplate = forwardRef<HTMLDivElement, { data: WeddingCardData }>(
  function ClassicWeddingTemplate({ data }, ref) {
    return (
      <div
        ref={ref}
        style={{
          width: WEDDING_CARD_WIDTH,
          height: WEDDING_CARD_HEIGHT,
          backgroundColor: data.backgroundColor,
          color: data.textColor,
          fontFamily: 'var(--font-amiri), serif',
          position: 'relative',
          direction: 'rtl',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 36,
            border: `2px solid ${data.accentColor}`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 50,
            border: `1px solid ${data.accentColor}`,
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 36,
            padding: '0 96px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 28, margin: 0, color: data.accentColor }}>{data.eyebrow}</p>

          <h1
            style={{
              fontSize: 58,
              fontWeight: 700,
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            {data.title}
          </h1>

          <p style={{ fontSize: 26, margin: 0, lineHeight: 1.7, maxWidth: 480 }}>{data.subtitle}</p>

          <div
            style={{
              marginTop: 20,
              width: 96,
              height: 1,
              backgroundColor: data.accentColor,
            }}
          />

          <div style={{ fontSize: 26, lineHeight: 2 }}>
            <p style={{ margin: 0 }}>{data.dateText}</p>
            <p style={{ margin: 0 }}>{data.timeText}</p>
            <p style={{ margin: 0, color: data.accentColor }}>{data.locationText}</p>
          </div>
        </div>
      </div>
    );
  },
);

export const WEDDING_TEMPLATE_COMPONENTS: Record<WeddingTemplateId, typeof FloralWeddingTemplate> =
  {
    floral: FloralWeddingTemplate,
    classic: ClassicWeddingTemplate,
  };

function CardFact({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 16, color, fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 20, maxWidth: 160 }}>{value}</span>
    </div>
  );
}

function FloralCorner({ color, corner }: { color: string; corner: 'top-start' | 'bottom-end' }) {
  const isTop = corner === 'top-start';
  return (
    <svg
      width="260"
      height="260"
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
