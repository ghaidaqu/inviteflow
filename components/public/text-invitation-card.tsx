import { forwardRef } from 'react';
import { BrandMark } from '@/components/brand-mark';
import { WEDDING_PALETTES } from '@/components/public/wedding-invitation-templates';

/**
 * An invitation that is only words.
 *
 * Some organizers have no design to upload and do not want one of the
 * wedding layouts either — they have written the invitation themselves
 * and want exactly that sent. This renders their text on the same card
 * the templates use, so it still arrives looking like an invitation
 * rather than a paragraph in a chat bubble.
 *
 * It has to be an image, not plain text, for a reason worth writing
 * down: the approved WhatsApp template `mahalli_event_invitation` has an
 * IMAGE header, and a template's header format is fixed at approval
 * time. Sending it without an image is rejected by Meta, and the
 * free-form fallback only reaches someone inside the 24-hour service
 * window — which, for an invitation, is almost nobody. So the text
 * becomes a card, and the same approved template carries it.
 */
export const TEXT_CARD_SIZE = 1080;

/** Long text has to stay inside the frame without the organizer thinking
 *  about type sizes, so the size steps down as the text grows. The
 *  thresholds are character counts at which the previous size starts
 *  running past the bottom edge of the card. */
export function textCardFontSize(text: string): number {
  const n = text.trim().length;
  if (n <= 60) return 74;
  if (n <= 140) return 60;
  if (n <= 260) return 50;
  if (n <= 420) return 42;
  if (n <= 640) return 35;
  return 30;
}

export const TextInvitationCard = forwardRef<HTMLDivElement, { text: string; paletteId?: string }>(
  function TextInvitationCard({ text, paletteId = 'mahalli' }, ref) {
    const palette = WEDDING_PALETTES.find((p) => p.id === paletteId) ?? WEDDING_PALETTES[0];
    const fontSize = textCardFontSize(text);

    return (
      <div
        ref={ref}
        style={{
          width: TEXT_CARD_SIZE,
          height: TEXT_CARD_SIZE,
          backgroundColor: palette.backgroundColor,
          color: palette.textColor,
          fontFamily: 'var(--font-amiri), serif',
          position: 'relative',
          direction: 'rtl',
          overflow: 'hidden',
        }}
      >
        {/* The same double rule the wedding cards carry, so a text
          invitation reads as part of the same family. */}
        <div
          style={{ position: 'absolute', inset: 46, border: `5px solid ${palette.accentColor}` }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 62,
            border: `1px solid ${palette.accentColor}`,
            opacity: 0.55,
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: 110,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 44,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize,
              lineHeight: 1.75,
              textAlign: 'center',
              // Keeps the organizer's own line breaks — they wrote it as a
              // shape, not just as a string — while still wrapping anything
              // too long for the frame.
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
            }}
          >
            {text}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: 0.88 }}>
            <BrandMark style={{ width: 34, height: 34 }} />
            <span
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: palette.accentColor,
                fontFamily: 'var(--font-amiri), serif',
              }}
            >
              مهلّي
            </span>
          </div>
        </div>
      </div>
    );
  },
);
