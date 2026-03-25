import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["test/integration/**", "node_modules/**"],
  },
  plugins: [
    cloudflareTest({
      // Don't reference wrangler.jsonc — it declares worker_loaders which
      // the vitest pool doesn't support.
      miniflare: {
        compatibilityDate: "2026-03-01",
        compatibilityFlags: ["nodejs_compat"],
        bindings: {
          GARMIN_OAUTH1: JSON.stringify({
            oauth_token: "test-oauth-token",
            oauth_token_secret: "test-oauth-secret",
          }),
          GARMIN_OAUTH2: JSON.stringify({
            access_token: "test-access-token",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
          }),
        },
      },
    }),
  ],
});
