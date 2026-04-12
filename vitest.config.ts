import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx", "src/**/*.test.ts"],
    exclude: ["tests/calibration/run.ts", "node_modules/**"],
    // Per AD-S2-02, all tests run against an in-process pglite Postgres
    // instance that is reset between tests. The setup file lives in
    // tests/audit/ since it owns the audit DB lifecycle. Pglite cold-start
    // adds ~2-5 seconds to the first test of each file, so the hook
    // timeout is bumped to 30s.
    setupFiles: ["./tests/audit/setup.ts"],
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
