import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig } from "vitest/config";
import { baseConfig } from "./base.ts";

/** Shared Vitest config for packages that render React components. */
export const reactConfig = mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      setupFiles: [fileURLToPath(new URL("./setup/react.ts", import.meta.url))],
    },
  }),
);
