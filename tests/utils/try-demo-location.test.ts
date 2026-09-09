// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { getOrCreateDemoEvent } from '@/lib/actions/try-demo';

describe('try-demo location', () => {
  it('repairs an existing demo event that has no map URL', async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq: updateEq }));
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: 'demo-event', slug: 'trial-demo', location_map_url: null },
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select, update }));

    await getOrCreateDemoEvent({ from } as never);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        location_map_url: expect.stringContaining('google.com/maps'),
      }),
    );
    expect(updateEq).toHaveBeenCalledWith('id', 'demo-event');
  });
});
