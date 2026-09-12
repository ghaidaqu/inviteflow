// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { guestRsvpConfirmationEmail, organizerNewRsvpEmail } from '@/lib/email/templates';

describe('email visual identity', () => {
  it('uses the Mhalli palette, wordmark and a clear action', () => {
    const { html } = guestRsvpConfirmationEmail('ar', {
      eventName: 'زفاف سارة وأحمد',
      editUrl: 'https://mhalli.co/ar/rsvp/example',
    });

    // The approved palette from lib/email/templates.ts — canvas, maroon, border.
    expect(html).toContain('#f8f3ec');
    expect(html).toContain('#6e2a2c');
    expect(html).toContain('#dfd2ba');
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
