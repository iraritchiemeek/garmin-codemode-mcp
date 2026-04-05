# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm auth` — authenticate with Garmin Connect (email/password + MFA)
- `pnpm auth:verify` — check if saved tokens are still valid
- `pnpm dev` — local dev server via Wrangler
- `pnpm deploy` — deploy to Cloudflare Workers
- `pnpm typecheck` — run `tsc --noEmit`
- `pnpm lint:quick` — fast oxlint check (~30ms), run after every edit
- `pnpm lint` — full oxlint check
- `pnpm format` — auto-format with Prettier
- `pnpm format:check` — check formatting without writing
- `pnpm knip` — detect dead code and unused exports
- `pnpm check` — full suite: typecheck + lint + format:check
- `pnpm test` — run all tests once
- `pnpm test:watch` — run tests in watch mode
- `pnpm vitest run test/garmin-api.test.ts` — run a single test file

## Architecture

Cloudflare Worker serving an MCP server via the Code Mode pattern. Individual Garmin API tools are registered on an `McpServer`, then `codeMcpServer` collapses them into a single `code` tool. The LLM writes JavaScript that chains `codemode.*` calls, and that code runs in an isolated Dynamic Worker sandbox.

### Request flow

1. MCP client sends a request to the Worker
2. `createMcpHandler` (from `agents/mcp`) handles MCP Streamable HTTP transport
3. `codeMcpServer` wraps the base `McpServer`'s tools into a single `code` tool
4. The LLM writes JS calling typed `codemode.*` methods (e.g. `codemode.list_activities()`)
5. `DynamicWorkerExecutor` spins up an isolated V8 sandbox via `env.LOADER`
6. Inside the sandbox, `codemode.*` calls route back to the host via RPC
7. Each tool's `execute` runs host-side with access to Garmin OAuth credentials
8. Only the final return value exits the sandbox

### Security boundary

Tool `execute` callbacks run on the host, not in the sandbox. Garmin credentials (`env.GARMIN_OAUTH1`, `env.GARMIN_OAUTH2`) never enter the sandbox. The sandbox can only interact with the host through typed `codemode.*` methods generated from registered tools.

### Auth flow

`GarminApi` (`src/garmin-api.ts`) uses OAuth 1.0a credentials to exchange for OAuth 2.0 access tokens. The `oauth-1.0a` library expects synchronous hashing but Workers only have async WebCrypto, so `refreshToken()` manually computes HMAC-SHA1 via `crypto.subtle` and patches the signature into the OAuth data. Tokens auto-refresh when expired.

### Adding tools

Register tools on the base `McpServer` via `server.registerTool()` with Zod input schemas. Each tool's execute function calls `api.get()` host-side. Group tools into modules under `src/tools/` and wire them from `src/index.ts` via a `register*Tools(server, api)` function.

## Testing

Tests use `@cloudflare/vitest-pool-workers` with the `cloudflareTest()` plugin, running inside the Workers runtime (workerd). The vitest config (`vitest.config.ts`) uses pure miniflare config instead of referencing `wrangler.jsonc` because `worker_loaders` bindings are not supported in the vitest pool.

Tests mock `globalThis.fetch` with `vi.fn<typeof fetch>()` — there is no `fetchMock` on `cloudflare:test` in the current pool version.

The codemode sandbox execution path (Dynamic Workers) cannot be automated-tested yet. Focus tests on `GarminApi` and tool handler logic, which run host-side.

## Key constraints

- `@modelcontextprotocol/sdk` is pinned to `1.26.0` to match the version `agents` bundles internally. A mismatch causes type errors due to private fields in `McpServer`.
- `wrangler.jsonc` declares `worker_loaders` and `nodejs_compat` — both required at runtime.
- `package.json` has `"type": "module"` — required for the vitest pool to load `@cloudflare/vitest-pool-workers` (ESM-only).

## Workflow Rules

1. **After every edit:** Run `pnpm lint:quick` to catch errors immediately.
2. **After every round of changes:** Run `pnpm typecheck` to verify type safety.
3. **Before committing:** Run `pnpm check` (typecheck + lint + format:check).
4. **Scope discipline:** Touch the minimum files necessary. Do not refactor, improve, or clean up unrelated code.
5. **One concern per commit:** Separate functional changes from formatting/lint fixes.

## Code Patterns

### Wrong vs Right

**Indexed access — always guard (noUncheckedIndexedAccess is on):**
```ts
// Wrong
const first = items[0].name;

// Right
const first = items[0];
if (!first) throw new Error("Expected at least one item");
return first.name;
```

**Tool registration — follow the existing pattern:**
```ts
// Wrong — don't use bare strings for Zod schemas
server.registerTool("my_tool", {
  description: "...",
  inputSchema: { date: z.string() },  // missing .describe()
}, async ({ date }) => { ... });

// Right — always .describe() params, return MCP content shape
server.registerTool("my_tool", {
  description: "Detailed description of what the tool returns and when to use it.",
  inputSchema: {
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Date in YYYY-MM-DD format"),
  },
}, async ({ date }) => {
  const data = await api.get<MyType>("/path", { date });
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});
```

**Tool modules — wire from index.ts:**
```ts
// Wrong — registering tools directly in index.ts
// Right — create src/tools/mymodule.ts with registerMyTools(server, api), import in index.ts
```

**MCP result type casting — use `as const` for `type` field:**
```ts
// Wrong
return { content: [{ type: "text", text: "..." }], isError: true };

// Right
return { content: [{ type: "text" as const, text: "..." }], isError: true };
```

### Known Exceptions

- `oauth-1.0a` has no bundled types — `src/oauth-1.0a.d.ts` provides ambient declarations.
- `hash_function: () => ""` in `GarminApi.refreshToken()` is intentional — it's a placeholder because the real HMAC-SHA1 is computed async via WebCrypto and patched in afterwards.
- `as Record<string, unknown>` casts in `codemode-server.ts` (`unwrapMcpResult`) are necessary because MCP result types are opaque.
