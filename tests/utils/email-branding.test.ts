// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { guestRsvpConfirmationEmail, organizerNewRsvpEmail } from '@/lib/email/templates';

describe('email visual identity', () => {
  it('uses the Mhalli palette, wordmark and a clear action', () => {
    const { html } = guestRsvpConfirmationEmail('ar', {
      eventName: 'زفاف سارة وأحمد',
      editUrl: 'https://mhalli.co/ar/rsvp/example',
    });

    expect(html).toContain('#f6efdc');
    expect(html).toContain('#96471f');
    expect(html).toContain('#3d6576');
    expect(html).toContain('مهلّي');
    expect(html).toContain('تعديل الرد');
  });

  it('escapes guest supplied content', () => {
    const { html } = organizerNewRsvpEmail('ar', {
      eventName: '<script>bad()</script>',
      guestName: '<b>ضيف</b>',
      status: 'attending',
    });

    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>ضيف</b>');
    expect(html).toContain('&lt;script&gt;');
  });
});
