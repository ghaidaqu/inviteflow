import { getTranslations } from 'next-intl/server';

export async function ProductPreviews() {
  const t = await getTranslations('HomePage.previews');

  return (
    <section className="bg-muted/30 py-16 sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t('title')}</h2>
          <p className="text-muted-foreground mt-3 text-base">{t('subtitle')}</p>
        </div>

        <div className="mx-auto mt-12 max-w-sm">
          {/* Invitation card mockup */}
          <div className="animate-in fade-in slide-in-from-bottom-2 bg-card rounded-3xl border p-6 shadow-sm duration-700">
            <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {t('invitationLabel')}
            </span>
            <div className="border-primary/20 mt-4 flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center">
              <span className="text-3xl">💍</span>
              <p className="text-lg leading-snug font-bold text-balance">{t('invitationSample')}</p>
              <span className="bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-medium">
                {t('invitationStatus')}
              </span>
              <div className="mt-1 flex w-full gap-2">
                <div className="bg-primary/90 flex-1 rounded-lg py-2 text-center text-xs font-semibold text-white">
                  ✓
                </div>
                <div className="border-border flex-1 rounded-lg border py-2 text-center text-xs font-semibold">
                  ✕
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
