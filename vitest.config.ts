import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
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
