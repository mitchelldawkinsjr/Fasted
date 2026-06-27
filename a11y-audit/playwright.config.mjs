import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "a11y.spec.mjs",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: process.env.A11Y_BASE_URL || "http://127.0.0.1:4173",
  },
});
