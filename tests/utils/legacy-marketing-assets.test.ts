// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('legacy marketing assets', () => {
  it.each(['invitation.jpg', 'rsvp.jpg', 'ticketing.jpg', 'hero-doorway.jpg'])(
    'does not publicly ship %s',
    (file) => {
      const folder = file === 'hero-doorway.jpg' ? 'images/marketing' : 'images/hero';
      expect(existsSync(resolve(process.cwd(), 'public', folder, file))).toBe(false);
    },
  );
});
