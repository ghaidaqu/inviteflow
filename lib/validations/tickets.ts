import { z } from 'zod';

export const ticketTypeStatuses = ['active', 'paused', 'ended'] as const;

const optionalDateTime = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => v === undefined || !Number.isNaN(Date.parse(v)), { error: 'dateInvalid' });

export const ticketTypeFormSchema = z.object({
  nameAr: z.string().trim().min(1, { error: 'nameRequired' }).max(150),
  nameEn: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  price: z.coerce.number().min(0, { error: 'priceInvalid' }),
  currency: z.string().trim().min(1).max(10).default('SAR'),
  quantityTotal: z.coerce.number().int().min(0, { error: 'quantityInvalid' }),
  maxPerOrder: z.coerce.number().int().min(1, { error: 'maxPerOrderInvalid' }),
  saleStartAt: optionalDateTime,
  saleEndAt: optionalDateTime,
  status: z.enum(ticketTypeStatuses),
});

export type TicketTypeFormInput = z.input<typeof ticketTypeFormSchema>;
export type TicketTypeFormOutput = z.output<typeof ticketTypeFormSchema>;

export const purchaseFormSchema = z.object({
  ticketTypeId: z.string().min(1, { error: 'ticketTypeRequired' }),
  quantity: z.coerce.number().int().min(1, { error: 'quantityInvalid' }),
  buyerName: z.string().trim().min(1, { error: 'nameRequired' }).max(150),
  buyerEmail: z
    .union([z.email({ error: 'emailInvalid' }), z.literal('')])
    .optional()
    .transform((v) => (v ? v : undefined)),
  buyerPhone: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type PurchaseFormInput = z.input<typeof purchaseFormSchema>;
export type PurchaseFormOutput = z.output<typeof purchaseFormSchema>;
