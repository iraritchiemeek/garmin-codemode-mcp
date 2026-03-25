# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` — local dev server via Wrangler
- `pnpm deploy` — deploy to Cloudflare Workers
- `pnpm typecheck` — run `tsc --noEmit`

## Architecture

This is a Cloudflare Worker that serves an MCP server using the Code Mode pattern. Instead of exposing one MCP tool per API endpoint, it uses `openApiMcpServer` from `@cloudflare/codemode/mcp` to generate two tools — `search` and `execute` — that let LLMs discover and call the entire Garmin Connect API in ~1,000 tokens.

### Request flow

1. MCP client sends a request to the Worker
2. `createMcpHandler` (from `agents/mcp`) handles MCP Streamable HTTP transport
3. `openApiMcpServer` receives tool calls and delegates to `DynamicWorkerExecutor`
4. The executor spins up an isolated V8 sandbox (Dynamic Worker) via the `env.LOADER` binding
5. LLM-generated code runs inside the sandbox with `globalOutbound: null` (no network access)
6. API calls from the sandbox are proxied through the host-side `request` callback, which injects auth and makes the real `fetch()`
7. Only the final return value exits the sandbox

### Security boundary

The `request` callback in `src/index.ts` is the auth injection point. Garmin credentials (`env.GARMIN_API_TOKEN`) never enter the sandbox — they are added host-side. The sandbox can only interact with the host through the `request` bridge provided by `openApiMcpServer`.

### Dependency note

`@modelcontextprotocol/sdk` is not a direct dependency — `agents` brings it in. Do not add it to `package.json` unless you need direct imports; version mismatches with the `agents` internal copy cause type errors due to private fields in `McpServer`.

## Wrangler config

`wrangler.jsonc` declares:
- `worker_loaders` binding — grants the Worker permission to spawn Dynamic Workers at runtime
- `nodejs_compat` flag — required by `@cloudflare/codemode`

## Current state

`src/spec.json` is a placeholder with empty `paths`. It needs to be populated with actual Garmin Connect API endpoints for `search` and `execute` to be functional. Garmin uses OAuth 1.0a, so the auth scheme in the `request` callback will also need updating.
