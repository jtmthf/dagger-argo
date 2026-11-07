import { defineConfig } from "vitest/config";

/**
 * Shared Vitest config for every workspace package.
 *
 * Packages consume it from their own `vitest.config.ts` (optionally via
 * `mergeConfig`) so each package keeps its own cacheable `test` task.
 */
export const baseConfig = defineConfig({
  test: {
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    passWithNoTests: true,
    restoreMocks: true,
  },
});
