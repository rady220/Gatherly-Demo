import { rmSync } from "node:fs";

export function setup() {
  // Remove any stale test DB to ensure a clean seed on every test run
  try {
    rmSync("./data/test-gatherly.db", { force: true });
  } catch {
    // ignore if file doesn't exist
  }
}
