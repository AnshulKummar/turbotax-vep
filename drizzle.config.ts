/**
 * Drizzle Kit config — controls `drizzle-kit generate` and migration output.
 *
 * Per AD-S2-02 the audit DB is Neon Postgres (HTTP driver). The schema lives
 * alongside the audit capture layer at src/lib/audit/schema.ts and the
 * generated SQL migrations land in ./drizzle/.
 */

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/audit/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
