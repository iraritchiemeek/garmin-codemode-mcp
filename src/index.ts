import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DynamicWorkerExecutor } from "@cloudflare/codemode";
import { codeMcpServer } from "@cloudflare/codemode/mcp";
import { createMcpHandler } from "agents/mcp";
import { GarminApi } from "./garmin-api.js";
import { registerActivityTools } from "./tools/activities.js";
import { registerHealthTools } from "./tools/health.js";
import { registerTrendsTools } from "./tools/trends.js";
import { registerTrainingTools } from "./tools/training.js";

export interface Env {
  LOADER: WorkerLoader;
  GARMIN_OAUTH1: string;
  GARMIN_OAUTH2: string;
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

export default {
  fetch: async (request: Request, env: Env, ctx: ExecutionContext) => {
    const server = await createServer(env);
    return createMcpHandler(server)(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
