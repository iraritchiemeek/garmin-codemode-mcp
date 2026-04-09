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
git clone https://github.com/iraritchiemeek/garmin-codemode-mcp
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

The Claude desktop app connects to remote MCP servers via **custom connectors**, which route through Anthropic's cloud — so the server must be publicly reachable. For the desktop app you'll need to [deploy to Cloudflare](#deploying-to-cloudflare) first; `http://localhost:8787` will not work.

Once deployed:

1. Open **Settings > Connectors** (or **Customize > Connectors**).
2. Click **Add custom connector**.
3. Enter your deployed URL with `/mcp` appended, e.g. `https://garmin-codemode-mcp.<your-subdomain>.workers.dev/mcp`.
4. Click **Add**, then **Connect** on the new connector and enter the `LOGIN_PASSWORD` you set during deploy.

Note: custom connectors require a paid Claude plan (Pro, Max, Team, or Enterprise). Free accounts are limited to a single connector.

## Deploying to Cloudflare

The Worker can be deployed as a remote MCP server. Remote deployments are gated by a password-based OAuth flow (`src/auth-handler.ts`) so only you can connect clients to it.

### 1. Log in to Cloudflare

```bash
pnpm wrangler login
```

### 2. Create a KV namespace for OAuth state

The OAuth provider stores authorization grants and tokens in Workers KV. Create the namespace:

```bash
pnpm wrangler kv namespace create OAUTH_KV
```

Wrangler prints an `id` — copy it into `wrangler.jsonc` under `kv_namespaces` (replacing the existing placeholder id):

```jsonc
"kv_namespaces": [
  { "binding": "OAUTH_KV", "id": "<your-kv-id>" }
]
```

### 3. Set secrets

The Worker needs three secrets: your Garmin OAuth 1.0a credentials, an initial OAuth 2.0 access token (the Worker auto-refreshes from here), and a password that gates the remote MCP authorization flow. The first two come from the JSON files written by `pnpm auth` into `~/.garmin-codemode-mcp/`.

```bash
# Paste the full contents of ~/.garmin-codemode-mcp/oauth1.json
pnpm wrangler secret put GARMIN_OAUTH1

# Paste the full contents of ~/.garmin-codemode-mcp/oauth2.json
pnpm wrangler secret put GARMIN_OAUTH2

# Choose a password — clients will enter this to authorize against the remote server
pnpm wrangler secret put LOGIN_PASSWORD
```

### 4. Deploy

```bash
pnpm deploy
```

Wrangler prints the deployed URL, e.g. `https://garmin-codemode-mcp.<your-subdomain>.workers.dev`. Use this URL with `/mcp` appended when connecting from [Claude Code](#claude-code-cli) or the [Claude desktop app](#claude-desktop-app). On first connect, the client opens an authorization page where you enter `LOGIN_PASSWORD`.

## Available Tools

Once connected, the server exposes a single `code` tool. The LLM writes JavaScript using typed `codemode.*` methods:

| Method                           | Description                                     |
| -------------------------------- | ----------------------------------------------- |
| `codemode.list_activities(...)`  | List activities with filters (type, date range) |
| `codemode.get_activity(...)`     | Get full activity details by ID                 |
| `codemode.activity_details(...)` | Get detailed metrics for an activity            |
| `codemode.activity_splits(...)`  | Get split data for an activity                  |
| `codemode.health(...)`           | Get health and wellness metrics                 |
| `codemode.trends(...)`           | Get trend analysis data                         |
| `codemode.training(...)`         | Get training status and recommendations         |

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
