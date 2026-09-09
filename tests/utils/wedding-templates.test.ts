// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/font/local', () => ({
  default: () => ({ className: 'test-font', variable: '--test-font' }),
}));
import {
  WEDDING_TEMPLATE_DIMENSIONS,
  WEDDING_TEMPLATE_IDS,
} from '@/components/public/wedding-invitation-templates';

describe('wedding invitation templates', () => {
  it('offers one square and two portrait designs', () => {
    expect(WEDDING_TEMPLATE_IDS).toEqual(['square', 'rectangle', 'archway']);
    expect(WEDDING_TEMPLATE_DIMENSIONS.square).toEqual({ width: 1080, height: 1080 });
    expect(WEDDING_TEMPLATE_DIMENSIONS.rectangle).toEqual({ width: 1080, height: 1620 });
    expect(WEDDING_TEMPLATE_DIMENSIONS.archway).toEqual({ width: 1080, height: 1620 });
  });
});
