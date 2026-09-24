import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/smoke/**/*.{test,spec}.ts"],
    // Smoke may hit real CLI; keep default hooks light.
    testTimeout: 60_000,
  },
});
