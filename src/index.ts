import { openApiMcpServer } from "@cloudflare/codemode/mcp";
import { DynamicWorkerExecutor } from "@cloudflare/codemode";
import { createMcpHandler } from "agents/mcp";
import spec from "./spec.json";

export interface Env {
  LOADER: WorkerLoader;
  GARMIN_API_TOKEN: string;
}

function createServer(env: Env) {
  const executor = new DynamicWorkerExecutor({
    loader: env.LOADER,
    globalOutbound: null,
  });

  return openApiMcpServer({
    spec,
    executor,
    name: "garmin-connect",
    version: "1.0.0",
    description: "Garmin Connect health and fitness data API",
    request: async ({ method, path, query, body }) => {
      const url = new URL(`https://apis.garmin.com${path}`);
      if (query) {
        for (const [k, v] of Object.entries(query)) {
          if (v !== undefined) url.searchParams.set(k, String(v));
        }
      }

      const res = await fetch(url.toString(), {
        method,
        headers: {
          Authorization: `Bearer ${env.GARMIN_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      return res.json();
    },
  });
}

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => {
    const server = createServer(env);
    return createMcpHandler(server)(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
