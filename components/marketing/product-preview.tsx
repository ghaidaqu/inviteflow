import { getTranslations } from 'next-intl/server';
import { GuestJourneyScene } from '@/components/marketing/guest-journey-scene';

/**
 * What the guest actually receives — the single biggest thing the
 * homepage was missing. It sold invitations without ever showing one, so
 * a visitor had to imagine the product before deciding to try it.
 *
 * Built as real markup rather than a screenshot, on purpose: a screenshot
 * of a WhatsApp thread ages the moment either app changes, can't be read
 * by a screen reader, and blurs on a phone. This walks through the three
 * real guest moments — the invitation with all three actions, the RSVP
 * confirmation, and the entry pass — using the app's own type and
 * color, so it can never drift from what the product really looks like.
 *
 * The names and date here are obviously a sample (a generic couple, a
 * placeholder hall) — nothing here is dressed up as a real customer's
 * event, and there's no invented testimonial or usage number anywhere on
 * this page.
 */
export async function ProductPreview() {
  const t = await getTranslations('HomePage.preview');

  return (
    <section className="section-y bg-muted/30 border-border/60 border-b">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <p className="text-primary text-sm font-semibold">{t('eyebrow')}</p>
        <h2 className="font-display mt-2 max-w-xl text-xl text-balance sm:text-2xl">
          {t('title')}
        </h2>

        <GuestJourneyScene
          copy={{
            step1Title: t('animationStep1Title'),
            step1Body: t('messageCaption'),
            step2Title: t('animationStep2Title'),
            step2Body: t('animationStep2Body'),
            step3Title: t('animationStep3Title'),
            step3Body: t('passFigCaption'),
            chatName: t('chatName'),
            invitationText: t('chatInvitationText'),
            accept: t('replyYes'),
            decline: t('replyNo'),
            location: t('replyLocation'),
            confirmationReply: t('confirmationReply'),
            confirmationReceipt: t('confirmationReceipt'),
            passTitle: t('passTitle'),
            passCaption: t('passCaption'),
          }}
        />
      </div>
    </section>
  );
}
