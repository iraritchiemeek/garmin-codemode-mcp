import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DynamicWorkerExecutor } from "@cloudflare/codemode";
import { OAuthProvider } from "@cloudflare/workers-oauth-provider";
import { codeMcpServer } from "./codemode-server.js";
import { createMcpHandler } from "agents/mcp";
import { GarminApi } from "./garmin-api.js";
import { registerActivityTools } from "./tools/activities.js";
import { registerHealthTools } from "./tools/health.js";
import { registerTrendsTools } from "./tools/trends.js";
import { registerTrainingTools } from "./tools/training.js";
import { authHandler } from "./auth-handler.js";

export interface Env {
  LOADER: WorkerLoader;
  GARMIN_OAUTH1: string;
  GARMIN_OAUTH2: string;
  LOGIN_PASSWORD: string;
  OAUTH_KV: KVNamespace;
}

async function createServer(env: Env) {
  const baseServer = new McpServer({
    name: "garmin-connect",
    version: "1.0.0",
  });

  const api = new GarminApi(env.GARMIN_OAUTH1, env.GARMIN_OAUTH2);
  registerActivityTools(baseServer, api);
  registerHealthTools(baseServer, api);
  registerTrendsTools(baseServer, api);
  registerTrainingTools(baseServer, api);

  const executor = new DynamicWorkerExecutor({
    loader: env.LOADER,
    globalOutbound: null,
  });

  return codeMcpServer({ server: baseServer, executor });
}

const mcpApiHandler = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const server = await createServer(env);
    return createMcpHandler(server)(request, env, ctx);
  },
};

export default new OAuthProvider({
  apiRoute: "/mcp",
  apiHandler: mcpApiHandler as never,
  defaultHandler: authHandler as never,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
});
