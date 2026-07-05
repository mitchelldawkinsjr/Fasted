import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    environmentMatchGlobs: [
      ['src/__tests__/**', 'jsdom'],
      ['**/*.test.tsx', 'jsdom'],
    ],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/__tests__/**/*.test.ts', 'src/__tests__/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'src/lib/sync.ts',
        'src/lib/groupCheckIns.ts',
        'src/lib/mealImages.ts',
      ],
      // Floor for critical lib modules; raise as more unit tests land.
      thresholds: {
        lines: 10,
        functions: 10,
        statements: 10,
      },
    },
  },
});
