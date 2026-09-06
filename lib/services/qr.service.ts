import 'server-only';
import path from 'node:path';
import QRCode from 'qrcode';
import sharp from 'sharp';
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
// CSS cascade) — see the memory note on the brand mark for why these
// specific values matter and shouldn't drift from them.
const COLOR_PRIMARY = '#96471f';
const COLOR_BACKGROUND = '#f6efdc';
const COLOR_INK = '#382616';

const CARD_WIDTH = 1080;
// Tall enough to fit the diamond+dot logo mark drawn near y≈1414 below the
// white card — this was shrunk once for a layout experiment without
// re-checking those absolute-positioned elements still fit inside it,
// which would have made sharp's composite() throw ("outside the image
// area") the first time this dormant function actually ran.
const CARD_HEIGHT = 1460;

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

async function renderText(
  text: string,
  { width, height, color }: { width: number; height: number; color: string },
): Promise<Buffer> {
  return sharp({
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

/**
 * The actual "entry card" a guest sees on WhatsApp — a branded frame
 * around the raw QR (title, guest name, event name, the مهلّي mark)
 * instead of a bare, unrecognizable QR image with no context. Composited
 * from separately-rendered pieces (background/shapes via one plain SVG
 * with no text in it at all, each text block via sharp's own text
 * renderer — see renderText's own comment for why) rather than one SVG
 * with embedded <text>, since SVG text shaping for Arabic isn't reliably
 * correct across environments the way Pango's is.
 */
export async function generateAndUploadEntryCard(
  key: string,
  content: string,
  guestName: string,
  eventName: string,
  locale: 'ar' | 'en',
): Promise<string | null> {
  try {
    const qrBuffer = await QRCode.toBuffer(content, { margin: 1, width: 620 });

    const frameSvg = Buffer.from(`
      <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${COLOR_BACKGROUND}" />
        <rect width="${CARD_WIDTH}" height="260" fill="${COLOR_PRIMARY}" />
        <rect x="90" y="330" width="900" height="760" rx="24" fill="#ffffff" stroke="${COLOR_PRIMARY}" stroke-width="2" />
        <path d="M 540 1370 L 562 1392 L 540 1414 L 518 1392 Z" fill="${COLOR_PRIMARY}" />
        <circle cx="540" cy="1392" r="7" fill="#3d6576" />
      </svg>
    `);

    const title = locale === 'ar' ? 'بطاقة دخول شخصية' : 'Personal Entry Card';
    const subtitle =
      locale === 'ar' ? 'يرجى إبراز الكود عند الوصول' : 'Please show this code on arrival';

    const [titleBuf, subtitleBuf, nameBuf, eventBuf, wordmarkBuf] = await Promise.all([
      renderText(title, { width: 900, height: 90, color: '#ffffff' }),
      renderText(subtitle, { width: 900, height: 60, color: '#ffffff' }),
      renderText(guestName, { width: 800, height: 80, color: COLOR_INK }),
      renderText(eventName, { width: 800, height: 60, color: COLOR_PRIMARY }),
      renderText('مهلّي', { width: 200, height: 60, color: COLOR_INK }),
    ]);

    const composite = await sharp(frameSvg)
      .composite([
        { input: titleBuf, top: 50, left: 90 },
        { input: subtitleBuf, top: 140, left: 90 },
        { input: qrBuffer, top: 400, left: 230 },
        { input: nameBuf, top: 1060, left: 140 },
        { input: eventBuf, top: 1130, left: 140 },
        { input: wordmarkBuf, top: 1410, left: 440 },
      ])
      .png()
      .toBuffer();

    return await uploadPng(`qr/${key}-card.png`, composite);
  } catch (error) {
    console.error('[qr] entry card generate/upload failed', error);
    return null;
  }
}
