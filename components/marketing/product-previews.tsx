import { getTranslations } from 'next-intl/server';

export async function ProductPreviews() {
  const t = await getTranslations('HomePage.previews');

  return (
    <section className="bg-muted/30 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-display text-2xl sm:text-3xl">{t('title')}</h2>
          <p className="text-muted-foreground mt-3 text-base">{t('subtitle')}</p>
        </div>

        <div className="mx-auto mt-8 max-w-sm">
          {/* Invitation preview, framed as a real webpage (browser chrome +
              URL bar) rather than a chat bubble with quick-reply buttons —
              the invitation is a proper link guests open, not a WhatsApp
              message, and the mockup should read that way at a glance. */}
          <div className="animate-in fade-in slide-in-from-bottom-2 bg-card overflow-hidden rounded-3xl border shadow-sm duration-700">
            <div className="border-border/60 bg-muted/40 flex items-center gap-2 border-b px-4 py-2.5">
              <span className="flex gap-1.5">
                <span className="size-2 rounded-full bg-red-400/70" />
                <span className="size-2 rounded-full bg-amber-400/70" />
                <span className="size-2 rounded-full bg-green-400/70" />
              </span>
              <span className="bg-background text-muted-foreground ms-1 flex-1 truncate rounded-full border px-3 py-1 text-[11px] ltr:text-left rtl:text-right">
                inviteflow.app/sara-ahmad
              </span>
            </div>

            <div className="p-6">
              <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {t('invitationLabel')}
              </span>
              <div className="border-primary/20 mt-4 flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center">
                <span className="text-3xl">💍</span>
                <p className="text-lg leading-snug font-bold text-balance">
                  {t('invitationSample')}
                </p>
                <span className="bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-medium">
                  {t('invitationStatus')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
