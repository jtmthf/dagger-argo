import { globalIgnores } from "eslint/config";
import playwright from "eslint-plugin-playwright";
import globals from "globals";
import { config as baseConfig } from "./base.js";

/**
 * A custom ESLint configuration for Playwright end-to-end test suites.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const playwrightConfig = [
  ...baseConfig,
  globalIgnores([
    "playwright-report/**",
    "test-results/**",
    "blob-report/**",
    "playwright/.cache/**",
  ]),
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    ...playwright.configs["flat/recommended"],
    files: ["tests/**"],
  },
];
