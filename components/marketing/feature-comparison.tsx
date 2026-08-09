import { getTranslations } from 'next-intl/server';
import { CheckIcon, MinusIcon } from 'lucide-react';

type Cell = 'yes' | 'no' | 'optional' | 'text';

const ROWS: {
  labelKey: string;
  invitation: Cell;
  rsvp: Cell;
  ticketing: Cell;
  invitationTextKey?: string;
  rsvpTextKey?: string;
  ticketingTextKey?: string;
}[] = [
  {
    labelKey: 'rowResponse',
    invitation: 'text',
    invitationTextKey: 'invitationResponse',
    rsvp: 'text',
    rsvpTextKey: 'rsvpResponse',
    ticketing: 'text',
    ticketingTextKey: 'ticketingResponse',
  },
  { labelKey: 'rowQuestions', invitation: 'no', rsvp: 'yes', ticketing: 'no' },
  { labelKey: 'rowTickets', invitation: 'no', rsvp: 'no', ticketing: 'yes' },
  { labelKey: 'rowQr', invitation: 'optional', rsvp: 'no', ticketing: 'yes' },
  {
    labelKey: 'rowBestFor',
    invitation: 'text',
    invitationTextKey: 'invitationBestFor',
    rsvp: 'text',
    rsvpTextKey: 'rsvpBestFor',
    ticketing: 'text',
    ticketingTextKey: 'ticketingBestFor',
  },
];

export async function FeatureComparison() {
  const t = await getTranslations('HomePage.comparison');

  function renderCell(cell: Cell, textKey?: string) {
    if (cell === 'yes') return <CheckIcon className="text-primary mx-auto size-5" />;
    if (cell === 'no') return <MinusIcon className="mx-auto size-5 opacity-30" />;
    if (cell === 'optional') return <span className="text-sm opacity-60">{t('optional')}</span>;
    return <span className="text-sm">{textKey ? t(textKey as 'rowResponse') : ''}</span>;
  }

  return (
    // Second "near-black" band for the ivory/black rhythm the editorial
    // direction calls for — plain dividers, no card border/shadow box.
    <section className="bg-foreground text-background py-16 sm:py-24">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <h2 className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
          {t('title')}
        </h2>

        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-center">
            <thead>
              <tr className="border-background/15 border-b">
                <th className="p-4 text-start text-sm font-medium"></th>
                <th className="p-4 text-sm font-bold">{t('colInvitation')}</th>
                <th className="p-4 text-sm font-bold">{t('colRsvp')}</th>
                <th className="p-4 text-sm font-bold">{t('colTicketing')}</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.labelKey} className="border-background/10 border-b last:border-b-0">
                  <td className="p-4 text-start text-sm font-medium opacity-70">
                    {t(row.labelKey as 'rowResponse')}
                  </td>
                  <td className="p-4">{renderCell(row.invitation, row.invitationTextKey)}</td>
                  <td className="p-4">{renderCell(row.rsvp, row.rsvpTextKey)}</td>
                  <td className="p-4">{renderCell(row.ticketing, row.ticketingTextKey)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
