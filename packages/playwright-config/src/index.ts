import { defineConfig, devices } from "@playwright/test";

export interface AppE2EOptions {
  /** Workspace package name of the app under test (e.g. "web"). */
  app: string;
  /**
   * Port to serve the app's production build on. Kept distinct from the app's
   * `dev` port so e2e runs never collide with (or silently reuse) a dev server.
   */
  port: number;
}

/**
 * Shared Playwright config for every e2e suite in the monorepo.
 *
 * Each suite runs against the app's production build (`next start`), which
 * Turborepo builds first via the `e2e` task's `^build` dependency.
 */
export function createPlaywrightConfig({ app, port }: AppE2EOptions) {
  const baseURL = `http://localhost:${port}`;
  const isCI = !!process.env.CI;

  return defineConfig({
    testDir: "./tests",
    fullyParallel: true,
    forbidOnly: isCI,
    retries: isCI ? 2 : 0,
    workers: isCI ? 1 : undefined,
    reporter: isCI ? [["list"], ["html", { open: "never" }]] : "html",
    use: {
      baseURL,
      trace: "on-first-retry",
      screenshot: "only-on-failure",
    },
    projects: [
      { name: "chromium", use: { ...devices["Desktop Chrome"] } },
      { name: "firefox", use: { ...devices["Desktop Firefox"] } },
      { name: "webkit", use: { ...devices["Desktop Safari"] } },
      { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
    ],
    webServer: {
      command: `pnpm --filter=${app} run start --port ${port}`,
      url: baseURL,
      reuseExistingServer: !isCI,
      timeout: 120_000,
      stdout: "ignore",
      stderr: "pipe",
    },
  });
}
