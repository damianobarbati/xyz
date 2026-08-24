import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 60_000, // 1min
    maxConcurrency: 1,
    sequence: { shuffle: { files: true } },
    chaiConfig: { truncateThreshold: process.env.CI ? 40 : 0 },
    coverage: {
      reporter: ["text", "json", "html", "cobertura"],
      reportsDirectory: "/tmp/coverage",
      skipFull: true,
      reportOnFailure: true,
      thresholds: { lines: 1, functions: 1, statements: 1, branches: 1 },
      exclude: ["**/vitest.*.ts", "**/src/database/**"],
    },
    restoreMocks: true,
  },
});
