import { describe, expect, it } from 'vitest';
import { slugify, randomSuffix } from '@/lib/utils/slug';

describe('slugify', () => {
  it('lowercases and replaces spaces with dashes', () => {
    expect(slugify('Sara & Ahmad Wedding')).toBe('sara-ahmad-wedding');
  });

  it('preserves Arabic letters', () => {
    expect(slugify('زفاف سارة وأحمد')).toBe('زفاف-سارة-وأحمد');
  });

  it('trims leading and trailing dashes', () => {
    expect(slugify('  --Hello World--  ')).toBe('hello-world');
  });

  it('falls back to "event" for input with no letters or numbers', () => {
    expect(slugify('!!!')).toBe('event');
  });

  it('collapses consecutive separators into a single dash', () => {
    expect(slugify('a   b---c')).toBe('a-b-c');
  });
});

describe('randomSuffix', () => {
  it('generates a suffix of the requested length', () => {
    expect(randomSuffix(5)).toHaveLength(5);
    expect(randomSuffix(8)).toHaveLength(8);
  });

  it('generates different values across calls', () => {
    const values = new Set(Array.from({ length: 20 }, () => randomSuffix()));
    expect(values.size).toBeGreaterThan(1);
  });
});
