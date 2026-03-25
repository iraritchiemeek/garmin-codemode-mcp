import { defineConfig } from "vitest/config";
import { readFileSync } from "node:fs";

// Load credentials from .dev.vars (same file wrangler uses)
function loadDevVars(): Record<string, string> {
  try {
    const content = readFileSync(".dev.vars", "utf-8");
    const vars: Record<string, string> = {};
    for (const line of content.split("\n")) {
      const eq = line.indexOf("=");
      if (eq > 0) {
        vars[line.slice(0, eq)] = line.slice(eq + 1);
      }
    }
    return vars;
  } catch {
    return {};
  }
}

const devVars = loadDevVars();

export default defineConfig({
  test: {
    include: ["test/integration/**/*.test.ts"],
    testTimeout: 30_000,
    env: {
      ...devVars,
    },
  },
});
