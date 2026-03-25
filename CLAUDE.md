# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` — local dev server via Wrangler
- `pnpm deploy` — deploy to Cloudflare Workers
- `pnpm typecheck` — run `tsc --noEmit`

## Architecture

This is a Cloudflare Worker that serves an MCP server using the Code Mode pattern. Individual Garmin API tools are registered on an `McpServer`, then wrapped with `codeMcpServer` from `@cloudflare/codemode/mcp` which collapses them into a single `code` tool. The LLM writes JavaScript that chains multiple tool calls, and that code runs in a Dynamic Worker sandbox.

### Request flow

1. MCP client sends a request to the Worker
2. `createMcpHandler` (from `agents/mcp`) handles MCP Streamable HTTP transport
3. `codeMcpServer` wraps the base `McpServer`'s tools into a single `code` tool
4. The LLM writes JS that calls typed `codemode.*` methods (e.g. `codemode.list_activities()`)
5. `DynamicWorkerExecutor` spins up an isolated V8 sandbox via `env.LOADER`
6. Inside the sandbox, `codemode.*` calls are routed back to the host via RPC
7. Each tool's `execute` runs host-side with access to `env.GARMIN_API_TOKEN`
8. Only the final return value exits the sandbox

### Security boundary

Tool `execute` callbacks run on the host, not in the sandbox. Garmin credentials (`env.GARMIN_API_TOKEN`) never enter the sandbox. The sandbox can only interact with the host through the typed `codemode.*` methods that `codeMcpServer` generates from the registered tools.

### Adding tools

Tools are registered on the base `McpServer` in `src/index.ts` via `server.registerTool()` with Zod input schemas. Each tool's execute function calls the Garmin API host-side. Group tools into separate modules under `src/tools/` as the surface grows.

### Dependency note

`@modelcontextprotocol/sdk` is pinned to `1.26.0` to match the version `agents` bundles internally. A mismatch causes type errors due to private fields in `McpServer`.

## Wrangler config

`wrangler.jsonc` declares:
- `worker_loaders` binding — grants the Worker permission to spawn Dynamic Workers at runtime
- `nodejs_compat` flag — required by `@cloudflare/codemode`

## Current state

The `codeMcpServer` wiring is in place but no Garmin tools are registered yet. Next step is defining tool modules with actual Garmin API endpoints. Garmin uses OAuth 1.0a, so the auth scheme will also need updating from the current Bearer token placeholder.
