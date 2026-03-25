import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DynamicWorkerExecutor } from "@cloudflare/codemode";
import { codeMcpServer } from "@cloudflare/codemode/mcp";
import { createMcpHandler } from "agents/mcp";

export interface Env {
  LOADER: WorkerLoader;
  GARMIN_API_TOKEN: string;
}

async function createServer(env: Env) {
  const baseServer = new McpServer({
    name: "garmin-connect",
    version: "1.0.0",
  });

  // TODO: Register Garmin tools on baseServer here

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
