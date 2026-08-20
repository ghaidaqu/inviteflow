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

// The two designs are deliberately different shapes, not just different
// colors — نسائي stays the tall portrait card a phone screen shows
// full-height; رجالي is a wide landscape card instead, closer to a
// printed formal announcement than a phone wallpaper.
export const WEDDING_TEMPLATE_DIMENSIONS: Record<
  WeddingTemplateId,
  { width: number; height: number }
> = {
  floral: { width: 750, height: 1200 },
  classic: { width: 1600, height: 1100 },
};

// Curated background/accent pairs for the color picker. `mahalli` mirrors
// the site's own --primary/--secondary/--background tokens exactly and is
// what both templates default to — a template-generated cover should look
// like it belongs to this product out of the box, not like a generic
// wedding-card palette that happens to be selectable. The other four stay
// as real alternate looks for organizers who want something else, not as
// competing defaults.
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
];

// The site's own secondary (teal) token — used as a second accent inside
// both templates (a hairline, a label color) alongside the primary/rust
// `accentColor`, the same two-color pairing the rest of the app uses
// rather than a single accent doing every job.
const BRAND_SECONDARY = '#3d6576';

export function defaultWeddingCardData(templateId: WeddingTemplateId): WeddingCardData {
  const palette = WEDDING_PALETTES[0]!; // mahalli — same default for both templates
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
 * Floral / feminine — portrait card, warm cream ground (site tokens by
 * default), rust corner line-art, the couple's names as the one large
 * accent-colored line, and a three-item fact row for date/location/time.
 * Ends in the same مهلّي credit line as the classic design below.
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

        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 26,
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
            <CardFact label="التاريخ" value={data.dateText} color={BRAND_SECONDARY} />
            <CardFact label="الموقع" value={data.locationText} color={BRAND_SECONDARY} />
            <CardFact label="الوقت" value={data.timeText} color={BRAND_SECONDARY} />
          </div>
        </div>

        <CardCredit textColor={data.textColor} />
      </div>
    );
  },
);

/**
 * Classical / formal — wide landscape card, a thin+thick double-line
 * frame (the "كرت نجد"-style border), the invitation read as one formal
 * block of centered prose, and date/time/location laid out as a row
 * instead of stacked lines since the landscape shape has the width for
 * it. Ends in the same مهلّي credit line as the floral design above.
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
            gap: 28,
            padding: '0 140px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 26, margin: 0, color: data.accentColor }}>{data.eyebrow}</p>

          <h1
            style={{
              fontSize: 56,
              fontWeight: 700,
              margin: 0,
              lineHeight: 1.35,
            }}
          >
            {data.title}
          </h1>

          <p style={{ fontSize: 24, margin: 0, lineHeight: 1.6, maxWidth: 640 }}>{data.subtitle}</p>

          <div
            style={{
              marginTop: 12,
              width: 96,
              height: 1,
              backgroundColor: BRAND_SECONDARY,
            }}
          />

          <div
            style={{
              display: 'flex',
              gap: 56,
              fontSize: 22,
            }}
          >
            <CardFact label="التاريخ" value={data.dateText} color={BRAND_SECONDARY} />
            <CardFact label="الوقت" value={data.timeText} color={BRAND_SECONDARY} />
            <CardFact label="الموقع" value={data.locationText} color={BRAND_SECONDARY} />
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

function CardFact({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 16, color, fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 20, maxWidth: 220 }}>{value}</span>
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
        bottom: 28,
        insetInline: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        opacity: 0.55,
      }}
    >
      <BrandMark style={{ width: 18, height: 18 }} />
      <span style={{ fontSize: 18, color: textColor, fontFamily: 'var(--font-amiri), serif' }}>
        {t('name')}
      </span>
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
