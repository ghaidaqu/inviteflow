import {
  forwardRef,
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useTranslations } from 'next-intl';
import { BrandMark } from '@/components/brand-mark';
import { arefRuqaa } from '@/lib/fonts';

export const WEDDING_CARD_BLOCK_IDS = [
  'eyebrow',
  'hostBlock',
  'invitationLine',
  'coupleBlock',
  'subtitle',
  'facts',
  'closing',
  'credit',
] as const;
export type WeddingCardBlockId = (typeof WEDDING_CARD_BLOCK_IDS)[number];

// One (x, y) nudge per draggable block, in the card's own 1080-wide
// coordinate space (not screen pixels — see DraggableBlock's `scale`
// prop for why). Missing/undefined entries mean "still at its default
// flex position", so an untouched card needs no offsets at all.
export type WeddingCardOffsets = Partial<Record<WeddingCardBlockId, { x: number; y: number }>>;

/**
 * The editable content + look of a template-generated cover — shared by
 * both designs below so the editor UI (color swatches, text fields) only
 * has to be built once. Mirrors the full structure of a real formal
 * Saudi/Gulf wedding invitation (checked directly against a real
 * invitation studio's own designs, kart49.com) rather than just a
 * couple's-names card: a دعاء opener, the two hosting families named as
 * "يتشرف [x] و [y]", the invitation line, then the groom/bride named
 * again under "الابن" / "كريمة" (the bride is referred to by her
 * father's name, not named directly — that's the real convention, not
 * an omission), before the day/time/location and a closing line.
 */
export type WeddingCardData = {
  eyebrow: string;
  hostName1: string;
  hostName2: string;
  invitationLine: string;
  groomFullName: string;
  brideFatherName: string;
  subtitle: string;
  closingLine: string;
  dateText: string;
  timeText: string;
  locationText: string;
  backgroundColor: string;
  accentColor: string;
  textColor: string;
  offsets: WeddingCardOffsets;
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
    hostName1: 'عبدالله محمد',
    hostName2: 'خالد سالم',
    invitationLine: 'بدعوتكم لحضور حفل زواج',
    groomFullName: 'محمد عبدالله',
    brideFatherName: 'خالد سالم',
    subtitle: 'وتناول طعام العشاء وذلك بمشيئة الله تعالى مساء يوم الخميس',
    closingLine: 'شاكرين لكم تلبية الدعوة',
    dateText: '١٦ يوليو ٢٠٢٦',
    timeText: 'من الساعة ٨:٠٠ م',
    locationText: 'قاعة الأفراح — الرياض',
    offsets: {},
    ...palette,
  };
}

type WeddingTemplateProps = {
  data: WeddingCardData;
  templateId: WeddingTemplateId;
  /** Lets the organizer drag any block to nudge its position — on in the
   * editor's live preview, off everywhere else (gallery thumbnails, the
   * exported PNG's own render pass) since there's no pointer to drag
   * with there anyway. */
  editable?: boolean;
  /** Screen-to-card scale factor — the editor shows this card scaled
   * down via `transform: scale()`, so a drag's on-screen pixel delta has
   * to be divided by this to land the block at the right spot in the
   * card's own 1080-wide coordinate space. 1 when rendered at real size
   * (the export pass, gallery thumbnails don't need dragging at all). */
  scale?: number;
  onOffsetChange?: (id: WeddingCardBlockId, offset: { x: number; y: number }) => void;
};

/**
 * One shared layout for both shapes (a plain right-angle double-line
 * frame in the card's accent color, the دعاء opener in Aref Ruqaa, then
 * the full formal-invitation body below it). Only the two templates'
 * pixel dimensions differ; every size below is a fraction of the card's
 * own width/height so the same JSX scales cleanly to either shape
 * instead of needing two near-duplicate components.
 */
const WeddingTemplate = forwardRef<HTMLDivElement, WeddingTemplateProps>(function WeddingTemplate(
  { data, templateId, editable, scale = 1, onOffsetChange },
  ref,
) {
  const { width, height } = WEDDING_TEMPLATE_DIMENSIONS[templateId];
  const isSquare = templateId === 'square';
  const offsets = data.offsets;

  function block(id: WeddingCardBlockId, children: React.ReactNode, basePosition?: CSSProperties) {
    return (
      <DraggableBlock
        id={id}
        offset={offsets[id]}
        editable={editable}
        scale={scale}
        onOffsetChange={onOffsetChange}
        basePosition={basePosition}
      >
        {children}
      </DraggableBlock>
    );
  }

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
          top: 90,
          bottom: isSquare ? 150 : 170,
          insetInline: 110,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-evenly',
          textAlign: 'center',
        }}
      >
        {block(
          'eyebrow',
          <p
            className={arefRuqaa.className}
            style={{
              fontSize: isSquare ? 40 : 44,
              color: data.accentColor,
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            {data.eyebrow}
          </p>,
        )}

        {block(
          'hostBlock',
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
            <BodyLine color={data.accentColor}>يتشرفُ</BodyLine>
            <NamesRow left={data.hostName2} right={data.hostName1} color={data.accentColor} />
          </div>,
        )}

        {block(
          'invitationLine',
          <BodyLine color={data.accentColor}>{data.invitationLine}</BodyLine>,
        )}

        {block(
          'coupleBlock',
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
            <LabelsRow color={data.accentColor} />
            <NamesRow
              left={data.brideFatherName}
              right={data.groomFullName}
              color={data.accentColor}
            />
          </div>,
        )}

        {block('subtitle', <BodyLine color={data.accentColor}>{data.subtitle}</BodyLine>)}

        <DiamondDivider color={data.accentColor} />

        {block(
          'facts',
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'baseline',
              gap: '6px 32px',
            }}
          >
            <CardFact label="التاريخ" value={data.dateText} color={data.accentColor} />
            <CardFact label="الموقع" value={data.locationText} color={data.accentColor} />
            <CardFact label="الوقت" value={data.timeText} color={data.accentColor} />
          </div>,
        )}

        {block(
          'closing',
          <p style={{ fontSize: 32, fontWeight: 700, margin: 0, color: data.accentColor }}>
            {data.closingLine}
          </p>,
        )}
      </div>

      {block('credit', <CardCredit accentColor={data.accentColor} />, {
        position: 'absolute',
        bottom: 58,
        insetInline: 0,
        display: 'flex',
        justifyContent: 'center',
      })}
    </div>
  );
});

export const SquareWeddingTemplate = forwardRef<
  HTMLDivElement,
  Omit<WeddingTemplateProps, 'templateId'>
>(function SquareWeddingTemplate(props, ref) {
  return <WeddingTemplate ref={ref} {...props} templateId="square" />;
});

export const RectangleWeddingTemplate = forwardRef<
  HTMLDivElement,
  Omit<WeddingTemplateProps, 'templateId'>
>(function RectangleWeddingTemplate(props, ref) {
  return <WeddingTemplate ref={ref} {...props} templateId="rectangle" />;
});

export const WEDDING_TEMPLATE_COMPONENTS: Record<WeddingTemplateId, typeof SquareWeddingTemplate> =
  {
    square: SquareWeddingTemplate,
    rectangle: RectangleWeddingTemplate,
  };

/**
 * Wraps one content block so the organizer can drag it to nudge its
 * position — `transform: translate()` on top of the block's normal flex
 * position, so a block that's never been dragged renders exactly where
 * it always did (an empty `offsets` object is a no-op). Pointer capture
 * means the drag keeps tracking even if the cursor leaves the block
 * mid-drag, and `touchAction: 'none'` stops the page from scrolling
 * under a finger on mobile while dragging.
 *
 * `basePosition` exists only for the مهلّي credit block: every other
 * block stays a normal flex child (translate is enough), but the credit
 * line is deliberately positioned outside that flex column (see the
 * `block('credit', …)` call in WeddingTemplate) so it can sit near the
 * bottom clear of the text above it — CSS `transform` on any element
 * also makes it a containing block for absolutely-positioned
 * descendants, so the credit's own position had to move here rather
 * than staying on CardCredit itself once this wrapper needed a
 * transform of its own.
 */
function DraggableBlock({
  id,
  offset,
  editable,
  scale = 1,
  onOffsetChange,
  basePosition,
  children,
}: {
  id: WeddingCardBlockId;
  offset?: { x: number; y: number };
  editable?: boolean;
  scale?: number;
  onOffsetChange?: (id: WeddingCardBlockId, offset: { x: number; y: number }) => void;
  basePosition?: CSSProperties;
  children: React.ReactNode;
}) {
  const drag = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(
    null,
  );
  const x = offset?.x ?? 0;
  const y = offset?.y ?? 0;

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!editable) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startY: e.clientY, originX: x, originY: y };
  }
  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!editable || !drag.current) return;
    const dx = (e.clientX - drag.current.startX) / scale;
    const dy = (e.clientY - drag.current.startY) / scale;
    onOffsetChange?.(id, { x: drag.current.originX + dx, y: drag.current.originY + dy });
  }
  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (!editable) return;
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  return (
    <div
      style={{
        width: '100%',
        ...basePosition,
        transform: `translate(${x}px, ${y}px)`,
        cursor: editable ? 'grab' : undefined,
        touchAction: editable ? 'none' : undefined,
        outline: editable
          ? '2px dashed color-mix(in srgb, currentColor 35%, transparent)'
          : undefined,
        outlineOffset: editable ? 4 : undefined,
        borderRadius: editable ? 6 : undefined,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      // Marks this node so the editor can strip the dashed outline
      // directly on the live DOM right before html-to-image captures it
      // — a React state toggle proved unreliable for this (the outline
      // still showed up in the exported PNG even with a render+paint
      // wait before capture), so the editor does it imperatively instead
      // of trusting render timing for something the export must get
      // exactly right.
      data-drag-outline={editable ? 'true' : undefined}
    >
      {children}
    </div>
  );
}

// One flat size (32px) for every "connective tissue" line below the
// دعاء opener — يتشرفُ / بدعوتكم.../ وتناول طعام العشاء... — matching a
// real formal invitation's actual type scale: the دعاء is the one
// stand-out line (its own font, bigger), everything under it reads at
// one consistent size rather than a ladder of hero/sub-hero blocks.
function BodyLine({ children, color }: { children: string; color: string }) {
  return <p style={{ fontSize: 32, margin: 0, lineHeight: 1.5, color }}>{children}</p>;
}

// A right/left name pair sharing a name row (e.g. "يتشرف [x] و [y]" or
// "الابن [x] وكريمة [y]") — a 3-column grid so a matching LabelsRow above
// it lines up over the correct name even when the two names are very
// different lengths, instead of each row centering itself independently.
function NamesRow({ left, right, color }: { left: string; right: string; color: string }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        columnGap: 16,
        width: '100%',
      }}
    >
      <span style={{ fontSize: 32, fontWeight: 700, color, textAlign: 'end' }}>{right}</span>
      <span style={{ fontSize: 32, color }}>و</span>
      <span style={{ fontSize: 32, fontWeight: 700, color, textAlign: 'start' }}>{left}</span>
    </div>
  );
}

// "الابن" / "كريمة" — fixed relationship labels (not organizer-edited;
// only the names below them are), sharing the same 3-column grid as the
// NamesRow beneath so each label sits directly above its name.
function LabelsRow({ color }: { color: string }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        columnGap: 16,
        width: '100%',
      }}
    >
      <span style={{ fontSize: 32, color, textAlign: 'end' }}>الابن</span>
      <span />
      <span style={{ fontSize: 32, color, textAlign: 'start' }}>كريمة</span>
    </div>
  );
}

// A plain fact — label then value, no border/background box around it.
// Boxed date/time/location chips read as an app-generated UI element;
// real invitation cards (kart49.com, checked directly) just run these as
// quiet plain text, so that's the convention this follows too. Same
// flat 32px as every other line — only the accent color on the label
// marks it as a label, not a bigger/smaller size.
function CardFact({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
      <span style={{ fontSize: 32, color, fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 32, color }}>{value}</span>
    </div>
  );
}

// The مهلّي credit line — same brand mark and wordmark colors as the rest
// of the site (not the card's own customizable accentColor), since this
// is a signature of who made the card, not part of the couple's own
// content. Its actual placement (near the bottom, clear of the text
// block above it) is set by the DraggableBlock wrapper's basePosition
// in WeddingTemplate, not here — this is just the row's own content.
function CardCredit({ accentColor }: { accentColor: string }) {
  const t = useTranslations('Brand');
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        opacity: 0.7,
      }}
    >
      <BrandMark style={{ width: 30, height: 30 }} />
      <span
        style={{
          fontSize: 32,
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
// transition from the names/invitation block to the date/time/location
// facts. Kept even though the frame around it went from a diamond motif
// to a plain square border: this one small diamond still ties back to
// the brand mark shape without competing with the frame.
function DiamondDivider({ color }: { color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} aria-hidden>
      <span style={{ width: 56, height: 1, background: color, opacity: 0.6 }} />
      <span
        style={{
          width: 9,
          height: 9,
          background: color,
          transform: 'rotate(45deg)',
        }}
      />
      <span style={{ width: 56, height: 1, background: color, opacity: 0.6 }} />
    </div>
  );
}
