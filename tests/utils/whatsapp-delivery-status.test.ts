import { describe, expect, it } from 'vitest';
import { shouldApplyStatus, isDeliveryStatus } from '@/lib/whatsapp/delivery-status';

describe('shouldApplyStatus', () => {
  it('advances through Meta’s normal progression', () => {
    expect(shouldApplyStatus('accepted', 'sent')).toBe(true);
    expect(shouldApplyStatus('sent', 'delivered')).toBe(true);
    expect(shouldApplyStatus('delivered', 'read')).toBe(true);
  });

  it('ignores a late webhook that would move the status backwards', () => {
    // Meta does not guarantee ordering; a delayed 'sent' arriving after
    // 'read' must not make a message that was read look unsent.
    expect(shouldApplyStatus('read', 'sent')).toBe(false);
    expect(shouldApplyStatus('delivered', 'accepted')).toBe(false);
  });

  it('ignores a repeat of the status already stored', () => {
    expect(shouldApplyStatus('delivered', 'delivered')).toBe(false);
  });

  it('always accepts a failure, whatever came before it', () => {
    expect(shouldApplyStatus('read', 'failed')).toBe(true);
    expect(shouldApplyStatus('accepted', 'failed')).toBe(true);
  });

  it('never lets a later status hide a failure', () => {
    expect(shouldApplyStatus('failed', 'sent')).toBe(false);
    expect(shouldApplyStatus('failed', 'delivered')).toBe(false);
    expect(shouldApplyStatus('failed', 'read')).toBe(false);
  });

  it('recognises only the statuses the column allows', () => {
    expect(isDeliveryStatus('delivered')).toBe(true);
    expect(isDeliveryStatus('deleted')).toBe(false);
    expect(isDeliveryStatus('')).toBe(false);
  });
});
