import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const envFile = new URL('../../.env', import.meta.url);

if (existsSync(envFile)) loadEnvFile(envFile);

export default defineConfig({
  test: {
    coverage: {
      enabled: true,
      provider: 'v8',
      reportsDirectory: fileURLToPath(new URL('../../.report-api-coverage/', import.meta.url)),
      reporter: ['text', 'lcov', 'json-summary'],
      include: ['src/**/*.ts'],
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 80,
      },
    },
    setupFiles: ['./vitest.setup.ts'],
    fileParallelism: false,
    sequence: { concurrent: false },
  },
});
