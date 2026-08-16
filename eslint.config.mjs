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
      // Third-party skill/tool packages installed via `npx skills add` /
      // `npx impeccable install` — not our app code, don't lint them.
      '.agents/**',
      '.claude/skills/**',
      '.github/skills/**',
      '.github/agents/**',
      // An unrelated project got copied into this working directory by
      // accident (has its own .git, its own — currently broken — deps).
      // Not InviteFlow code; excluded so this repo's own lint stays a
      // signal instead of ~8700 lines of noise from a different app.
      'halq-barbershop-work/**',
    ],
  },
];

export default eslintConfig;
