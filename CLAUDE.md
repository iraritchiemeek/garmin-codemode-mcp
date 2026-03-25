# Garmin Code Mode MCP

MCP server for the Garmin Connect API, built with Cloudflare's Code Mode pattern (`@cloudflare/codemode`) and Dynamic Workers.

## Architecture

- **Pattern**: Code Mode two-tool (`search` + `execute`) via `openApiMcpServer`
- **Runtime**: Cloudflare Workers with Dynamic Worker isolates for sandboxed code execution
- **API**: Garmin Connect API (activity, health, device data)
- **Goal**: Expose the full Garmin API surface in ~1,000 tokens instead of one tool per endpoint

## Stack

- Runtime: Cloudflare Workers
- Package manager: `pnpm`
- Key dependencies: `@cloudflare/codemode`, `ai`, `zod`
- Config: `wrangler.jsonc` with `worker_loaders` binding and `nodejs_compat` flag

## Key Concepts

- `DynamicWorkerExecutor` creates isolated V8 sandboxes per execution
- `openApiMcpServer` generates `search` and `execute` tools from an OpenAPI spec
- `globalOutbound: null` blocks network access by default; auth is injected host-side in the `request` handler
- Garmin OAuth tokens must never enter the sandbox — credential injection happens in the host worker
