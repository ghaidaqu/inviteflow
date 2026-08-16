import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    // halq-barbershop-work is an unrelated project accidentally copied into
    // this working directory (its own .git, unrelated broken deps) — not
    // InviteFlow code, and its own tests aren't ours to run or fix.
    exclude: ['**/node_modules/**', '**/halq-barbershop-work/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
    },
  },
});
