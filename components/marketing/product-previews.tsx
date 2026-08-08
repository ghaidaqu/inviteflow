import { getTranslations } from 'next-intl/server';

// A small hand-built "QR-ish" pixel pattern (not a real scannable code —
// just the finder-square + noise silhouette that reads as "QR code" at a
// glance) so the ticket mockup doesn't lean on a generic icon.
const QR_NOISE = [
  '1,1,1,0,1,0,1',
  '1,0,1,1,0,1,1',
  '0,1,0,1,1,0,1',
  '1,1,0,0,1,1,0',
  '0,1,1,0,1,0,1',
];

function QrGlyph() {
  return (
    <svg viewBox="0 0 29 29" className="size-16" aria-hidden>
      <rect width="29" height="29" rx="2" fill="white" />
      {/* three finder squares, like a real QR code */}
      {[
        [1, 1],
        [22, 1],
        [1, 22],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="6" height="6" fill="#2a1013" />
          <rect x={x + 1} y={y + 1} width="4" height="4" fill="white" />
          <rect x={x + 2} y={y + 2} width="2" height="2" fill="#2a1013" />
        </g>
      ))}
      {/* noise grid in the remaining space to sell the silhouette */}
      {QR_NOISE.flatMap((row, ri) =>
        row
          .split(',')
          .map((cell, ci) =>
            cell === '1' ? (
              <rect
                key={`${ri}-${ci}`}
                x={9 + ci * 2}
                y={9 + ri * 2}
                width="1.6"
                height="1.6"
                fill="#2a1013"
              />
            ) : null,
          ),
      )}
    </svg>
  );
}

export async function ProductPreviews() {
  const t = await getTranslations('HomePage.previews');

  return (
    <section className="bg-muted/30 py-16 sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('title')}</h2>
          <p className="text-muted-foreground mt-3 text-lg">{t('subtitle')}</p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {/* Invitation card mockup */}
          <div className="animate-in fade-in slide-in-from-bottom-2 rounded-3xl border bg-gradient-to-b from-white to-rose-50/60 p-6 shadow-sm duration-700 dark:from-neutral-900 dark:to-neutral-900">
            <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {t('invitationLabel')}
            </span>
            <div className="border-primary/20 mt-4 flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center">
              <span className="text-2xl">💍</span>
              <p className="text-base leading-snug font-bold text-balance">
                {t('invitationSample')}
              </p>
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

          {/* Ticket mockup — stub shape with a perforated divider */}
          <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-col overflow-hidden rounded-3xl border bg-gradient-to-b from-white to-blue-50/60 p-6 shadow-sm duration-700 [animation-delay:80ms] dark:from-neutral-900 dark:to-neutral-900">
            <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {t('ticketLabel')}
            </span>
            <div className="relative mt-4 flex items-stretch overflow-hidden rounded-2xl bg-[oklch(0.42_0.09_250)] text-white">
              <div className="flex flex-1 flex-col justify-between p-4">
                <div>
                  <p className="text-sm font-bold">{t('ticketSample')}</p>
                  <p className="mt-1 text-xs text-white/70">{t('ticketHolder')}</p>
                </div>
                <div
                  aria-hidden
                  className="mt-4 border-t border-dashed border-white/30 bg-[radial-gradient(circle_at_left,transparent_6px,transparent_6px)]"
                />
              </div>
              <div
                aria-hidden
                className="bg-background relative flex w-24 shrink-0 items-center justify-center before:absolute before:start-1/2 before:-top-3 before:size-6 before:-translate-x-1/2 before:rounded-full before:bg-[oklch(0.98_0.008_60)] before:content-[''] after:absolute after:start-1/2 after:-bottom-3 after:size-6 after:-translate-x-1/2 after:rounded-full after:bg-[oklch(0.98_0.008_60)] after:content-['']"
              >
                <QrGlyph />
              </div>
            </div>
          </div>

          {/* Poll results mockup — simple bar chart */}
          <div className="animate-in fade-in slide-in-from-bottom-2 rounded-3xl border bg-gradient-to-b from-white to-emerald-50/60 p-6 shadow-sm duration-700 [animation-delay:160ms] dark:from-neutral-900 dark:to-neutral-900">
            <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {t('pollLabel')}
            </span>
            <p className="mt-4 text-sm font-bold text-balance">{t('pollSample')}</p>
            <div className="mt-4 flex flex-col gap-3">
              {[
                { label: t('pollOption1'), pct: 62 },
                { label: t('pollOption2'), pct: 28 },
                { label: t('pollOption3'), pct: 10 },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="text-muted-foreground w-14 shrink-0 text-xs">{row.label}</span>
                  <div className="bg-muted h-2.5 flex-1 overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full bg-[oklch(0.5_0.11_165)]"
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                  <span className="w-9 shrink-0 text-end text-xs font-semibold tabular-nums">
                    {row.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
