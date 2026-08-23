import { forwardRef } from 'react';
import { useTranslations } from 'next-intl';
import { BrandMark } from '@/components/brand-mark';
import { arefRuqaa } from '@/lib/fonts';

/**
 * The editable content + look of a template-generated cover — shared by
 * both designs below so the editor UI (color swatches, text fields) only
 * has to be built once. `eyebrow` is the calligraphic opening line (a
 * dua, set in Aref Ruqaa — see the font's own comment in lib/fonts.ts),
 * `subtitle` is the line just under the couple's names.
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

// Named by shape, not gender — square and rectangle are simply two
// different card proportions to pick from, not a "men's design" vs
// "women's design" split. Real Saudi/Gulf invitation cards researched
// for this feature don't actually vary by aspect ratio for that reason
// either; the shape names are just a clearer, more useful way to offer
// two options than a gendered label.
export const WEDDING_TEMPLATE_IDS = ['square', 'rectangle'] as const;
export type WeddingTemplateId = (typeof WEDDING_TEMPLATE_IDS)[number];

export const WEDDING_TEMPLATE_DIMENSIONS: Record<
  WeddingTemplateId,
  { width: number; height: number }
> = {
  square: { width: 1080, height: 1080 },
  rectangle: { width: 1080, height: 1620 },
};

// Curated background/accent/text triples for the color picker. `mahalli`
// mirrors the site's own --primary/--secondary/--background tokens and
// is the default for both shapes — a real invitation studio's cards
// (kart49.com, checked directly) read as one consistent family across
// their own designs, not a different palette per shape, so there's no
// reason for ours to fork either. The rest stay selectable alternates.
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

export function defaultWeddingCardData(_templateId: WeddingTemplateId): WeddingCardData {
  const palette = WEDDING_PALETTES[0]!;
  return {
    eyebrow: 'بارك الله لهما وبارك عليهما وجمع بينهما في خير',
    title: 'سارة & محمد',
    subtitle: 'يسرّنا دعوتكم لحضور حفل زواجنا',
    dateText: 'الخميس ١٦ يوليو ٢٠٢٦',
    timeText: 'من الساعة ٨:٠٠ م',
    locationText: 'قاعة الأفراح — الرياض',
    ...palette,
  };
}

/**
 * One shared layout for both shapes (a plain right-angle double-line
 * frame in the card's accent color, the دعاء opener in Aref Ruqaa, the
 * couple's names as the one large line, a quiet plain-text fact row —
 * no boxes around the date/time/location, matching the flatter,
 * unboxed convention real cards use — and the مهلّي credit sitting on
 * its own near the bottom, clear of the text above it). Only the two
 * templates' pixel dimensions differ; every size below is a percentage
 * of the card's own width/height so the same JSX scales cleanly to
 * either shape instead of needing two near-duplicate components.
 */
const WeddingTemplate = forwardRef<
  HTMLDivElement,
  { data: WeddingCardData; templateId: WeddingTemplateId }
>(function WeddingTemplate({ data, templateId }, ref) {
  const { width, height } = WEDDING_TEMPLATE_DIMENSIONS[templateId];
  const isSquare = templateId === 'square';

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
      <div style={{ position: 'absolute', inset: 52, border: `6px solid ${data.accentColor}` }} />
      <div style={{ position: 'absolute', inset: 70, border: `2px solid ${data.accentColor}` }} />

      <div
        style={{
          position: 'absolute',
          top: 96,
          bottom: isSquare ? 150 : 170,
          insetInline: 120,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-evenly',
          textAlign: 'center',
        }}
      >
        <p
          className={arefRuqaa.className}
          style={{
            fontSize: isSquare ? 50 : 54,
            color: data.accentColor,
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          {data.eyebrow}
        </p>

        <h1
          style={{
            fontSize: isSquare ? 92 : 100,
            fontWeight: 700,
            margin: 0,
            lineHeight: 1.25,
          }}
        >
          {data.title}
        </h1>

        <p style={{ fontSize: isSquare ? 32 : 34, margin: 0, lineHeight: 1.6, maxWidth: 720 }}>
          {data.subtitle}
        </p>

        <DiamondDivider color={data.accentColor} />

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'baseline',
            gap: '10px 40px',
          }}
        >
          <CardFact label="التاريخ" value={data.dateText} color={data.accentColor} />
          <CardFact label="الموقع" value={data.locationText} color={data.accentColor} />
          <CardFact label="الوقت" value={data.timeText} color={data.accentColor} />
        </div>
      </div>

      <CardCredit accentColor={data.accentColor} />
    </div>
  );
});

export const SquareWeddingTemplate = forwardRef<HTMLDivElement, { data: WeddingCardData }>(
  function SquareWeddingTemplate({ data }, ref) {
    return <WeddingTemplate ref={ref} data={data} templateId="square" />;
  },
);

export const RectangleWeddingTemplate = forwardRef<HTMLDivElement, { data: WeddingCardData }>(
  function RectangleWeddingTemplate({ data }, ref) {
    return <WeddingTemplate ref={ref} data={data} templateId="rectangle" />;
  },
);

export const WEDDING_TEMPLATE_COMPONENTS: Record<WeddingTemplateId, typeof SquareWeddingTemplate> =
  {
    square: SquareWeddingTemplate,
    rectangle: RectangleWeddingTemplate,
  };

// A plain fact — label above value, no border/background box around it.
// Boxed date/time/location chips read as an app-generated UI element;
// real invitation cards (kart49.com, checked directly) just run these as
// quiet plain text, so that's the convention this follows too.
function CardFact({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 22, color, fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 26 }}>{value}</span>
    </div>
  );
}

// The مهلّي credit line — same brand mark and wordmark colors as the rest
// of the site (not the card's own customizable accentColor), since this
// is a signature of who made the card, not part of the couple's own
// content. Positioned on its own, well clear of the text block above it,
// rather than as the last item in the same flex column.
function CardCredit({ accentColor }: { accentColor: string }) {
  const t = useTranslations('Brand');
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 62,
        insetInline: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        opacity: 0.7,
      }}
    >
      <BrandMark style={{ width: 26, height: 26 }} />
      <span
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: accentColor,
          fontFamily: 'var(--font-amiri), serif',
        }}
      >
        {t('name')}
      </span>
    </div>
  );
}

// A small mid-card divider — hairline, diamond, hairline — marking the
// transition from the couple's names/blessing block to the date/time/
// location facts. Kept even though the frame around it went from a
// diamond motif to a plain square border: this one small diamond still
// ties back to the brand mark shape without competing with the frame.
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
