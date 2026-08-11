import { defineConfig } from "vitest/config";
import { rmSync } from "node:fs";

export default defineConfig({
  test: {
    env: {
      DATABASE_PATH: "./data/test-gatherly.db",
    },
    globalSetup: "./vitest.global-setup.ts",
  },
});
