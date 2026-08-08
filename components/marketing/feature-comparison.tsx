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
    if (cell === 'no') return <MinusIcon className="text-muted-foreground/50 mx-auto size-5" />;
    if (cell === 'optional')
      return <span className="text-muted-foreground text-sm">{t('optional')}</span>;
    return <span className="text-sm">{textKey ? t(textKey as 'rowResponse') : ''}</span>;
  }

  return (
    <section className="bg-muted/30 py-16 sm:py-24">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <h2 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
          {t('title')}
        </h2>

        <div className="mt-10 overflow-x-auto">
          <table className="bg-card w-full min-w-[640px] border-collapse overflow-hidden rounded-2xl border text-center shadow-sm">
            <thead>
              <tr className="border-b">
                <th className="p-4 text-start text-sm font-medium"></th>
                <th className="p-4 text-sm font-bold">{t('colInvitation')}</th>
                <th className="p-4 text-sm font-bold">{t('colRsvp')}</th>
                <th className="p-4 text-sm font-bold">{t('colTicketing')}</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.labelKey} className="border-b last:border-b-0">
                  <td className="text-muted-foreground p-4 text-start text-sm font-medium">
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
