# Garmin Connect MCP Server

A Cloudflare Worker that exposes Garmin Connect fitness data as an MCP (Model Context Protocol) server using the [Code Mode](https://developers.cloudflare.com/agents/model-context-protocol/codemode/) pattern. Instead of exposing individual tools, the server collapses all Garmin API tools into a single `code` tool — the LLM writes JavaScript that chains typed `codemode.*` calls, which execute in an isolated V8 sandbox.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) (v10+)
- A [Garmin Connect](https://connect.garmin.com/) account
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) or the [Claude desktop app](https://claude.ai/download)

## Local Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd garmin-codemode-mcp
pnpm install
```

### 2. Authenticate with Garmin Connect

Run the CLI auth flow to obtain OAuth credentials:

```bash
pnpm auth
```

This will prompt for your Garmin email, password, and MFA code. Tokens are saved to `~/.garmin-codemode-mcp/`.

To verify your saved tokens are still valid:

```bash
pnpm auth:verify
```

### 3. Run the dev server

```bash
pnpm dev
```

This starts a local Wrangler dev server (default: `http://localhost:8787`). The server uses your locally saved Garmin credentials.

## Connecting to Claude

### Claude Code (CLI)

Add the server to your project's `.mcp.json` file:

```json
{
  "mcpServers": {
    "garmin-connect": {
      "type": "url",
      "url": "http://localhost:8787/mcp"
    }
  }
}
```

### Claude Desktop App

Open **Settings > Developer > Edit Config** and add:

```json
{
  "mcpServers": {
    "garmin-connect": {
      "type": "url",
      "url": "http://localhost:8787/mcp"
    }
  }
}
```

Then restart Claude.

## Available Tools

Once connected, the server exposes a single `code` tool. The LLM writes JavaScript using typed `codemode.*` methods:

| Method | Description |
|---|---|
| `codemode.list_activities(...)` | List activities with filters (type, date range) |
| `codemode.get_activity(...)` | Get full activity details by ID |
| `codemode.activity_details(...)` | Get detailed metrics for an activity |
| `codemode.activity_splits(...)` | Get split data for an activity |
| `codemode.health(...)` | Get health and wellness metrics |
| `codemode.trends(...)` | Get trend analysis data |
| `codemode.training(...)` | Get training status and recommendations |

## Development

```bash
pnpm dev              # Start local dev server
pnpm typecheck        # Type check
pnpm lint:quick       # Fast lint (~30ms)
pnpm check            # Full suite: typecheck + lint + format check
pnpm test             # Run tests
pnpm test:watch       # Run tests in watch mode
pnpm knip             # Detect dead code
```
