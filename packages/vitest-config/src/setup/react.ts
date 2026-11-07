import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Unmount rendered trees between tests (RTL only auto-cleans with `globals: true`).
afterEach(() => {
  cleanup();
});
