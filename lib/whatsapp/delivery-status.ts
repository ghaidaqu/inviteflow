/**
 * The ordering rule for WhatsApp delivery statuses.
 *
 * Kept apart from whatsapp-delivery.service.ts (which is `server-only`,
 * since it reaches for the admin client) so this part — the piece most
 * likely to be subtly wrong and least likely to be noticed — can be
 * tested on its own.
 */
export type DeliveryStatus = 'accepted' | 'sent' | 'delivered' | 'read' | 'failed';

// 'accepted' is ours, not Meta's: the API took the message and nothing has
// come back yet. The rest mirror Meta's own status values, in the order it
// normally reports them.
const RANK: Record<DeliveryStatus, number> = {
  accepted: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 4,
};

export function isDeliveryStatus(value: string): value is DeliveryStatus {
  return value in RANK;
}

/**
 * Whether an incoming status should replace the one already stored.
 *
 * Meta does not guarantee webhook ordering, so a delayed 'sent' can land
 * after 'read'. Statuses therefore only ever move forward — except a
 * failure, which is terminal and always wins, and can never be papered
 * over by a later status.
 */
export function shouldApplyStatus(current: DeliveryStatus, next: DeliveryStatus): boolean {
  if (current === 'failed') return false;
  if (next === 'failed') return true;
  return RANK[next] > RANK[current];
}
