'use client';

import { useState, useTransition } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel, FieldError, FieldGroup } from '@/components/ui/field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  purchaseFormSchema,
  type PurchaseFormInput,
  type PurchaseFormOutput,
} from '@/lib/validations/tickets';
import { purchaseTicketsAction } from '@/lib/actions/tickets';
import { Link } from '@/i18n/navigation';
import type { Database } from '@/types/supabase';

type TicketTypeRow = Database['public']['Tables']['ticket_types']['Row'];

export function PurchaseForm({
  eventSlug,
  ticketTypes,
}: {
  eventSlug: string;
  ticketTypes: TicketTypeRow[];
}) {
  const t = useTranslations('PublicTickets');
  const tErrors = useTranslations('PublicTickets.errors');
  const tValidation = useTranslations('PublicTickets.validation');
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [purchasedTickets, setPurchasedTickets] = useState<{ qrToken: string }[] | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<PurchaseFormInput, unknown, PurchaseFormOutput>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      ticketTypeId: ticketTypes[0]?.id ?? '',
      quantity: 1,
      buyerName: '',
      buyerEmail: '',
      buyerPhone: '',
    },
  });

  const selectedTicketTypeId = watch('ticketTypeId');
  const selectedTicketType = ticketTypes.find((tt) => tt.id === selectedTicketTypeId);

  function fieldMessage(message?: string) {
    if (!message) return undefined;
    return tValidation(message);
  }

  function onSubmit(values: PurchaseFormOutput) {
    setServerError(null);
    const formData = new FormData();
    formData.set('ticketTypeId', values.ticketTypeId);
    formData.set('quantity', String(values.quantity));
    formData.set('buyerName', values.buyerName);
    formData.set('buyerEmail', values.buyerEmail ?? '');
    formData.set('buyerPhone', values.buyerPhone ?? '');

    startTransition(async () => {
      const result = await purchaseTicketsAction(eventSlug, {}, formData);
      if (result.error) setServerError(result.error);
      else if (result.tickets) setPurchasedTickets(result.tickets);
    });
  }

  if (purchasedTickets) {
    return (
      <div className="bg-card flex flex-col gap-4 rounded-xl border p-6 text-center">
        <p className="text-lg font-medium">{t('purchaseSuccessTitle')}</p>
        <p className="text-muted-foreground">{t('purchaseSuccessDescription')}</p>
        <div className="flex flex-col gap-2">
          {purchasedTickets.map((ticket, index) => (
            <Link
              key={ticket.qrToken}
              href={`/tickets/${ticket.qrToken}`}
              className="text-primary font-medium underline-offset-4 hover:underline"
            >
              {t('viewTicket', { number: index + 1 })}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{tErrors(serverError)}</AlertDescription>
        </Alert>
      )}

      <FieldGroup>
        <Field data-invalid={!!errors.ticketTypeId}>
          <FieldLabel htmlFor="ticketTypeId">{t('ticketTypeLabel')}</FieldLabel>
          <Controller
            control={control}
            name="ticketTypeId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="ticketTypeId" className="w-full">
                  <SelectValue>
                    {(value: string | null) => {
                      const selected = ticketTypes.find((tt) => tt.id === value);
                      if (!selected) return '';
                      return `${selected.name_ar} — ${selected.price > 0 ? `${selected.price} ${selected.currency}` : t('free')}`;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ticketTypes.map((tt) => (
                    <SelectItem key={tt.id} value={tt.id}>
                      {tt.name_ar} — {tt.price > 0 ? `${tt.price} ${tt.currency}` : t('free')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError>{fieldMessage(errors.ticketTypeId?.message)}</FieldError>
        </Field>

        <Field data-invalid={!!errors.quantity}>
          <FieldLabel htmlFor="quantity">{t('quantityLabel')}</FieldLabel>
          <Input
            id="quantity"
            type="number"
            min={1}
            max={selectedTicketType?.max_per_order ?? 10}
            {...register('quantity')}
          />
          <FieldError>{fieldMessage(errors.quantity?.message)}</FieldError>
        </Field>

        <Field data-invalid={!!errors.buyerName}>
          <FieldLabel htmlFor="buyerName">{t('buyerNameLabel')}</FieldLabel>
          <Input id="buyerName" {...register('buyerName')} />
          <FieldError>{fieldMessage(errors.buyerName?.message)}</FieldError>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.buyerEmail}>
            <FieldLabel htmlFor="buyerEmail">{t('buyerEmailLabel')}</FieldLabel>
            <Input id="buyerEmail" type="email" {...register('buyerEmail')} />
            <FieldError>{fieldMessage(errors.buyerEmail?.message)}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="buyerPhone">{t('buyerPhoneLabel')}</FieldLabel>
            <Input id="buyerPhone" type="tel" {...register('buyerPhone')} />
          </Field>
        </div>

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? t('purchasing') : t('purchaseButton')}
        </Button>
      </FieldGroup>
    </form>
  );
}
