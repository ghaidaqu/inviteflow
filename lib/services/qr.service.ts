import 'server-only';
import path from 'node:path';
import QRCode from 'qrcode';
import sharp, { type OverlayOptions } from 'sharp';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Generates a PNG QR code and uploads it to the same public bucket cover
 * images already use (under a qr/ prefix) rather than provisioning a
 * dedicated bucket — it's already public and already proven to work.
 * Returns the public URL, or null on any failure. Best-effort by design:
 * every caller treats a failed QR as "the RSVP still succeeded, just
 * couldn't attach a QR this time" rather than something to fail loudly on.
 */
export async function generateAndUploadQr(key: string, content: string): Promise<string | null> {
  try {
    const buffer = await QRCode.toBuffer(content, { margin: 1, width: 512 });
    return await uploadPng(`qr/${key}.png`, buffer);
  } catch (error) {
    console.error('[qr] generate/upload failed', error);
    return null;
  }
}

// مهلّي brand colors — hard-coded rather than read from app/globals.css's
// CSS variables (unreachable here; this runs server-side, no browser, no
// CSS cascade). See the memory note on the brand mark for the logo's own
// two colors; the rest (card/ink/muted/border) are the app's --card,
// --foreground, --muted-foreground and --border tokens verbatim.
const COLOR_CARD = '#f8f3ec';
const COLOR_INK = '#382616';
const COLOR_MUTED = '#6b5640';
const COLOR_BORDER = '#c7b285';

// The visible card sits inset inside a larger transparent canvas — the
// margin is where the drop shadow (below) gets to fall off without being
// clipped, and leaving it transparent (not filled with a page color) means
// the PNG drops onto a WhatsApp thread or a camera roll without a visible
// hard-edged rectangle around it.
const OUTER_WIDTH = 1160;
const OUTER_HEIGHT = 1520;
const CARD_X = 40;
const CARD_Y = 40;
const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1440;
const CONTENT_X0 = CARD_X + 70;
const CONTENT_X1 = CARD_X + CARD_WIDTH - 70;
const CENTER_X = CARD_X + CARD_WIDTH / 2;

// Sharp's own text-rendering (Pango under the hood) shapes Arabic
// correctly — including the شدة on مهلّي — where a plain SVG <text>
// element does not reliably in every environment; the font file is
// pointed to directly rather than relying on fontconfig discovering it
// (a headless container may have no fontconfig setup at all, and
// pointing at a `fontfile` bypasses needing one). WOFF2 (the format
// actually shipped for the live site's own text) isn't something
// Pango/FreeType can read directly — this is that font's own glyph data
// decompressed to a plain TTF once, checked into public/fonts alongside
// the woff2 the browser uses, not a duplicate elsewhere.
const AMIRI_TTF = path.join(process.cwd(), 'public/fonts/amiri-700.ttf');

type RenderedText = { buffer: Buffer; width: number; height: number };

/**
 * Renders one line of text to its own tightly-cropped PNG. sharp's
 * create-from-text mode only uses width/height as a wrapping constraint —
 * the buffer it returns is cropped to the actual glyph extent, not padded
 * out to the box requested — so every caller centers/right-aligns using
 * the *returned* width, never the width passed in here.
 */
async function renderText(
  text: string,
  { width, height, color }: { width: number; height: number; color: string },
): Promise<RenderedText> {
  const buffer = await sharp({
    text: {
      text: `<span foreground="${color}">${escapeXml(text)}</span>`,
      font: 'Amiri',
      fontfile: AMIRI_TTF,
      width,
      height,
      rgba: true,
      align: 'center',
    },
  })
    .png()
    .toBuffer();
  const meta = await sharp(buffer).metadata();
  return { buffer, width: meta.width ?? width, height: meta.height ?? height };
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function uploadPng(objectPath: string, buffer: Buffer): Promise<string | null> {
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from('event-covers')
    .upload(objectPath, buffer, { contentType: 'image/png', upsert: true });
  if (error) throw error;
  const {
    data: { publicUrl },
  } = admin.storage.from('event-covers').getPublicUrl(objectPath);
  return publicUrl;
}

type CardFooter =
  // The entry pass's real footer: who this covers and how many, on the
  // right, domain reminder on the left, divided by a vertical rule.
  | { kind: 'party'; partySize: number }
  // The generic share card has no specific guest to name — just the
  // domain, centered, no divider.
  | { kind: 'domain-only' };

/**
 * Shared frame every branded QR card in the app renders through — same
 * card, logo, shadow and QR placement either way (approved design, see
 * the memory note on the brand mark), just different heading copy and
 * footer content depending on what the QR actually does once scanned.
 * generateAndUploadEntryCard (a specific guest's door pass) and
 * generateAndUploadShareCard (the event's own public link, for anyone)
 * both compose through this instead of duplicating the whole layout.
 */
async function renderQrCard({
  content,
  title,
  caption,
  footer,
}: {
  content: string;
  title: string;
  caption: string;
  footer: CardFooter;
}): Promise<Buffer> {
  // Black modules, not the ink brown — every card here is a real
  // functional QR meant to be scanned (a door pass, or an invitation
  // link), so maximum contrast for a reliable scan comes ahead of
  // matching the brand color exactly. The light modules are transparent
  // so the card's own cream shows through instead of a mismatched white
  // square behind the code.
  const qrBuffer = await QRCode.toBuffer(content, {
    margin: 1,
    width: 680,
    color: { dark: '#000000', light: '#00000000' },
  });

  const domainText = 'mhalli.co';
  const footerTexts =
    footer.kind === 'party'
      ? await Promise.all([
          renderText('ضيف', { width: 120, height: 40, color: COLOR_INK }),
          renderText('Guest', { width: 120, height: 30, color: COLOR_MUTED }),
          renderText(String(Math.max(1, footer.partySize)), {
            width: 90,
            height: 80,
            color: COLOR_INK,
          }),
          renderText(domainText, { width: 240, height: 40, color: COLOR_MUTED }),
        ])
      : null;

  const [wordmark, titleText, captionText, domainCentered] = await Promise.all([
    renderText('مهلّي', { width: 170, height: 64, color: COLOR_INK }),
    renderText(title, { width: 940, height: 100, color: COLOR_INK }),
    renderText(caption, { width: 940, height: 60, color: COLOR_MUTED }),
    footer.kind === 'domain-only'
      ? renderText(domainText, { width: 400, height: 40, color: COLOR_MUTED })
      : null,
  ]);

  const DIAMOND_SIZE = 48;
  const LOGO_GAP = 14;
  const logoGroupWidth = DIAMOND_SIZE + LOGO_GAP + wordmark.width;
  const diamondX = Math.round(CENTER_X - logoGroupWidth / 2);
  const diamondY = 121;
  const wordmarkX = diamondX + DIAMOND_SIZE + LOGO_GAP;
  const wordmarkY = Math.round(diamondY + (DIAMOND_SIZE - wordmark.height) / 2);

  const titleX = Math.round(CENTER_X - titleText.width / 2);
  const captionX = Math.round(CENTER_X - captionText.width / 2);
  const officialSymbol = await sharp(
    path.join(process.cwd(), 'public/brand/mhalli-official-symbol-upright.svg'),
  )
    .resize(DIAMOND_SIZE, DIAMOND_SIZE)
    .png()
    .toBuffer();

  const composites: OverlayOptions[] = [
    { input: officialSymbol, left: diamondX, top: diamondY },
    { input: wordmark.buffer, left: wordmarkX, top: wordmarkY },
    { input: titleText.buffer, left: titleX, top: 250 },
    { input: qrBuffer, left: Math.round(CENTER_X - 340), top: 420 },
    { input: captionText.buffer, left: captionX, top: 1140 },
  ];

  let footerDividerSvg = '';
  if (footerTexts) {
    const [guestAr, guestEn, count, domain] = footerTexts;
    const domainX = CONTENT_X1 - domain.width;
    const footerDividerX = CONTENT_X0 + Math.max(guestAr.width, guestEn.width) + 24;
    const countX = footerDividerX + 24;
    footerDividerSvg = `<rect x="${footerDividerX}" y="1298" width="2" height="74" fill="${COLOR_BORDER}" />`;
    composites.push(
      { input: guestAr.buffer, left: CONTENT_X0, top: 1300 },
      { input: guestEn.buffer, left: CONTENT_X0, top: 1348 },
      { input: count.buffer, left: countX, top: 1300 },
      { input: domain.buffer, left: domainX, top: 1330 },
    );
  } else if (domainCentered) {
    const domainX = Math.round(CENTER_X - domainCentered.width / 2);
    composites.push({ input: domainCentered.buffer, left: domainX, top: 1315 });
  }

  const frameSvg = Buffer.from(`
    <svg width="${OUTER_WIDTH}" height="${OUTER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="10" stdDeviation="18" flood-color="${COLOR_INK}" flood-opacity="0.16" />
        </filter>
      </defs>
      <rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="48" fill="${COLOR_CARD}" filter="url(#shadow)" />
      <rect x="${CONTENT_X0}" y="1250" width="${CONTENT_X1 - CONTENT_X0}" height="2" fill="${COLOR_BORDER}" />
      ${footerDividerSvg}
    </svg>
  `);

  return sharp(frameSvg).composite(composites).png().toBuffer();
}

/**
 * The branded "entry pass" a guest gets after RSVPing attending on an
 * event with entry QR enabled — a plain frame around the raw QR (logo,
 * title, instruction, party size) instead of an unrecognizable bare QR
 * image with no context. Design approved directly by the user (a
 * hand-drawn reference mockup): vertical, minimal, no photos or
 * guest/event names on the card itself — that identifying context stays
 * in the WhatsApp caption text instead (see sendGuestQrWhatsApp), the
 * image itself is deliberately generic so it reads the same for every
 * guest at every event.
 *
 * `content` is the guest's own RSVP edit link — scanning it is a real,
 * working thing to do (see check-in.service.ts), not a dead end.
 * `partySize` is the guest plus their confirmed companions, shown in the
 * footer as "how many this pass covers", not a queue number.
 */
export async function generateAndUploadEntryCard(
  key: string,
  content: string,
  partySize: number,
): Promise<string | null> {
  try {
    const composite = await renderQrCard({
      content,
      title: 'بطاقة دخول',
      caption: 'يرجى إبراز الرمز للدخول',
      footer: { kind: 'party', partySize },
    });
    return await uploadPng(`qr/${key}-card.png`, composite);
  } catch (error) {
    console.error('[qr] entry card generate/upload failed', error);
    return null;
  }
}

/**
 * The same branded card, for the event's own public link rather than one
 * guest's personal pass — shown on the public invitation page for anyone
 * to scan and open the invitation (a poster, a printed card at a venue
 * entrance, sharing it hands-free). No guest/party footer since it isn't
 * tied to one person; just the domain, centered.
 *
 * Cached by `key` (the event id — stable for its lifetime, and so is
 * `content`, the event's own public link) rather than regenerated on
 * every call: unlike the per-guest entry card (called once, right after
 * that guest's own RSVP), this one's caller is the public invitation
 * page itself — a page real guests load repeatedly — and re-running
 * several Pango text renders plus a sharp composite on every single page
 * view would be a real, needless cost on a hot path.
 */
export async function generateAndUploadShareCard(
  key: string,
  content: string,
): Promise<string | null> {
  const objectPath = `${key}-share.png`;
  try {
    const admin = createAdminClient();
    const { data: existing } = await admin.storage
      .from('event-covers')
      .list('qr', { search: objectPath });
    if (existing?.some((file) => file.name === objectPath)) {
      const {
        data: { publicUrl },
      } = admin.storage.from('event-covers').getPublicUrl(`qr/${objectPath}`);
      return publicUrl;
    }

    const composite = await renderQrCard({
      content,
      title: 'امسح لفتح الدعوة',
      caption: 'وجّه كاميرا جوالك نحو الرمز',
      footer: { kind: 'domain-only' },
    });
    return await uploadPng(`qr/${objectPath}`, composite);
  } catch (error) {
    console.error('[qr] share card generate/upload failed', error);
    return null;
  }
}
