'use client';

import { useState, useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import {
  ticketTypeFormSchema,
  ticketTypeStatuses,
  type TicketTypeFormInput,
  type TicketTypeFormOutput,
} from '@/lib/validations/tickets';
import type { TicketTypeActionState } from '@/lib/actions/tickets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Field, FieldLabel, FieldError, FieldGroup } from '@/components/ui/field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Database } from '@/types/supabase';

type TicketTypeRow = Database['public']['Tables']['ticket_types']['Row'];

function toDateTimeLocal(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIso(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

export function TicketTypeForm({
  ticketType,
  action,
  onSuccess,
}: {
  ticketType?: TicketTypeRow;
  action: (prevState: TicketTypeActionState, formData: FormData) => Promise<TicketTypeActionState>;
  onSuccess?: () => void;
}) {
  const t = useTranslations('Tickets.form');
  const tErrors = useTranslations('Tickets.errors');
  const tValidation = useTranslations('Tickets.validation');
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<TicketTypeFormInput, unknown, TicketTypeFormOutput>({
    resolver: zodResolver(ticketTypeFormSchema),
    defaultValues: {
      nameAr: ticketType?.name_ar ?? '',
      nameEn: ticketType?.name_en ?? '',
      price: ticketType?.price ?? 0,
      currency: ticketType?.currency ?? 'SAR',
      quantityTotal: ticketType?.quantity_total ?? 100,
      maxPerOrder: ticketType?.max_per_order ?? 10,
      saleStartAt: toDateTimeLocal(ticketType?.sale_start_at ?? null),
      saleEndAt: toDateTimeLocal(ticketType?.sale_end_at ?? null),
      status: ticketType?.status ?? 'active',
    },
  });

  function fieldMessage(message?: string) {
    if (!message) return undefined;
    return tValidation(message);
  }

  function onSubmit(values: TicketTypeFormOutput) {
    setServerError(null);
    const formData = new FormData();
    formData.set('nameAr', values.nameAr);
    formData.set('nameEn', values.nameEn ?? '');
    formData.set('price', String(values.price));
    formData.set('currency', values.currency);
    formData.set('quantityTotal', String(values.quantityTotal));
    formData.set('maxPerOrder', String(values.maxPerOrder));
    formData.set('saleStartAt', toIso(values.saleStartAt));
    formData.set('saleEndAt', toIso(values.saleEndAt));
    formData.set('status', values.status);

    startTransition(async () => {
      const result = await action({}, formData);
      if (result?.error) setServerError(result.error);
      else onSuccess?.();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{tErrors(serverError)}</AlertDescription>
        </Alert>
      )}

      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.nameAr}>
            <FieldLabel htmlFor="nameAr">{t('nameArLabel')}</FieldLabel>
            <Input id="nameAr" {...register('nameAr')} />
            <FieldError>{fieldMessage(errors.nameAr?.message)}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="nameEn">{t('nameEnLabel')}</FieldLabel>
            <Input id="nameEn" {...register('nameEn')} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field data-invalid={!!errors.price}>
            <FieldLabel htmlFor="price">{t('priceLabel')}</FieldLabel>
            <Input id="price" type="number" step="0.01" min="0" {...register('price')} />
            <FieldError>{fieldMessage(errors.price?.message)}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="currency">{t('currencyLabel')}</FieldLabel>
            <Input id="currency" {...register('currency')} />
          </Field>
          <Field data-invalid={!!errors.quantityTotal}>
            <FieldLabel htmlFor="quantityTotal">{t('quantityTotalLabel')}</FieldLabel>
            <Input id="quantityTotal" type="number" min="0" {...register('quantityTotal')} />
            <FieldError>{fieldMessage(errors.quantityTotal?.message)}</FieldError>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.maxPerOrder}>
            <FieldLabel htmlFor="maxPerOrder">{t('maxPerOrderLabel')}</FieldLabel>
            <Input id="maxPerOrder" type="number" min="1" {...register('maxPerOrder')} />
            <FieldError>{fieldMessage(errors.maxPerOrder?.message)}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="status">{t('statusLabel')}</FieldLabel>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue>
                      {(value: string | null) =>
                        value ? t(`statuses.${value}` as 'statuses.active') : ''
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ticketTypeStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {t(`statuses.${status}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="saleStartAt">{t('saleStartAtLabel')}</FieldLabel>
            <Input id="saleStartAt" type="datetime-local" {...register('saleStartAt')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="saleEndAt">{t('saleEndAtLabel')}</FieldLabel>
            <Input id="saleEndAt" type="datetime-local" {...register('saleEndAt')} />
          </Field>
        </div>

        <Button type="submit" disabled={isPending} className="w-full sm:w-fit">
          {isPending ? t('saving') : ticketType ? t('saveChanges') : t('create')}
        </Button>
      </FieldGroup>
    </form>
  );
}
