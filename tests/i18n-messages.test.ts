import { describe, expect, it } from 'vitest';
import ar from '../messages/ar.json';
import en from '../messages/en.json';

function collectKeyPaths(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([key, value]) =>
    collectKeyPaths(value, prefix ? `${prefix}.${key}` : key),
  );
}

describe('i18n message parity', () => {
  it('ar.json and en.json expose the exact same translation keys', () => {
    const arKeys = collectKeyPaths(ar).sort();
    const enKeys = collectKeyPaths(en).sort();

    expect(arKeys).toEqual(enKeys);
  });
});
