import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      // A leftover git worktree from an earlier session. Gitignored, so it
      // never ships, but it still holds vendored third-party scripts that
      // buried the app's own warnings under 459 of theirs.
      '.claude/worktrees/**',
    ],
  },
  {
    rules: {
      // The codebase already marks a deliberately-unused binding with a
      // leading underscore (e.g. defaultWeddingCardData(_templateId), kept
      // because callers pass it and per-template defaults are the obvious
      // next step). Honour that convention instead of warning about it.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
];

export default eslintConfig;
