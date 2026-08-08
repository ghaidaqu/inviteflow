import { getTranslations } from 'next-intl/server';
import { MessageCircleIcon, CreditCardIcon, LinkIcon, ShieldCheckIcon } from 'lucide-react';

const POINTS = [
  { key: 'point1', icon: MessageCircleIcon },
  { key: 'point2', icon: CreditCardIcon },
  { key: 'point3', icon: LinkIcon },
  { key: 'point4', icon: ShieldCheckIcon },
] as const;

export async function WhyInviteFlow() {
  const t = await getTranslations('HomePage.why');

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      {/* Deliberately asymmetric (big statement + a stacked list), not three
          equal columns — the most common, most generic AI layout pattern. */}
      <div className="grid gap-10 sm:grid-cols-5 sm:gap-12">
        <div className="sm:col-span-2">
          <h2 className="text-2xl font-extrabold tracking-tight text-balance sm:text-3xl">
            {t('title')}
          </h2>
          <p className="text-muted-foreground mt-4 text-base text-balance">{t('statement')}</p>
        </div>

        <ul className="flex flex-col gap-6 sm:col-span-3">
          {POINTS.map(({ key, icon: Icon }) => (
            <li key={key} className="flex items-start gap-4">
              <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
                <Icon className="size-5" />
              </span>
              <p className="pt-1.5 text-base leading-relaxed">{t(key)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
