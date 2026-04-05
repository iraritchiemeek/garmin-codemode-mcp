/**
 * Thin wrapper around the upstream codeMcpServer that injects a
 * Garmin-specific CODE_DESCRIPTION with activity type hierarchy,
 * efficiency rules, and return value guidance.
 *
 * The upstream codeMcpServer hardcodes a generic description with no
 * way to customise it, so we replicate the wiring here using the same
 * exported utilities (generateTypesFromJsonSchema, sanitizeToolName,
 * DynamicWorkerExecutor) from @cloudflare/codemode.
 */
import {
  sanitizeToolName,
  generateTypesFromJsonSchema,
  type DynamicWorkerExecutor,
} from "@cloudflare/codemode";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { z } from "zod";

const CHARS_PER_TOKEN = 4;
const MAX_TOKENS = 6_000;
const MAX_CHARS = MAX_TOKENS * CHARS_PER_TOKEN;

function truncateResponse(content: unknown): string {
  const text =
    typeof content === "string" ? content : (JSON.stringify(content, null, 2) ?? "undefined");
  if (text.length <= MAX_CHARS) return text;
  return `${text.slice(0, MAX_CHARS)}\n\n--- TRUNCATED ---\nResponse was ~${Math.ceil(text.length / CHARS_PER_TOKEN).toLocaleString()} tokens (limit: ${MAX_TOKENS.toLocaleString()}). Use more specific queries to reduce response size.`;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Unwrap an MCP CallToolResult so sandbox code sees plain values.
 * Mirrors the upstream unwrapMcpResult from @cloudflare/codemode 0.3.3.
 */
function unwrapMcpResult(result: unknown): unknown {
  const r = result as Record<string, unknown>;
  if ("toolResult" in r) return r.toolResult;
  if (r.isError) {
    const content = r.content as Array<{ type: string; text?: string }>;
    const msg =
      content
        .filter((c) => c.type === "text" && c.text)
        .map((c) => c.text)
        .join("\n") || "Tool call failed";
    throw new Error(msg);
  }
  if (r.structuredContent != null) return r.structuredContent;
  const content = r.content as Array<{ type: string; text?: string }>;
  if (content.length > 0 && content.every((c) => c.type === "text")) {
    const text = content.map((c) => c.text ?? "").join("\n");
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return result;
}

const CODE_DESCRIPTION = `Execute JavaScript code to query and analyse Garmin Connect data. You have a full programming environment — use it to fetch, filter, combine, and compute in a single invocation.

## Available methods

{{types}}

## Writing code

Write an async arrow function in JavaScript that returns the final, processed result.
- Do NOT use TypeScript syntax — no type annotations, interfaces, or generics.
- Do NOT define named functions then call them — write the arrow function body directly.

## Efficiency rules

Each codemode.* call is an API round-trip. Minimise the number of calls:

1. **One-shot**: Fetch all the data you need, then filter, transform, and compute the answer in code. Never return raw data for the LLM to process in a follow-up call.
2. **No N+1 loops**: Do NOT call a tool once per item in a loop (e.g. fetching gear for each of 100 activities). Instead, use tools that accept filters, or fetch a broader dataset and filter in code.
3. **Parallel fetches**: When you need data from independent endpoints, use Promise.all:
   \`\`\`js
   const [gear, activities] = await Promise.all([
     codemode.list_gear({}),
     codemode.get_activities_by_date({ startDate: "2025-01-01", endDate: "2025-12-31" })
   ]);
   \`\`\`
4. **Compute in code**: Calculate aggregations (median, average, trends, rankings) inside the function. Return the final answer, not intermediate data.
5. **Filter server-side first**: Use available parameters (activityType, date ranges, limits) to reduce the dataset before processing in code.

## Activity types

Types are hierarchical — querying a parent includes all children.

| Parent | Children |
|--------|----------|
| running | street_running, trail_running, track_running, treadmill_running, indoor_running, virtual_run, obstacle_run, ultra_run |
| cycling | road_biking, mountain_biking, indoor_cycling, gravel_cycling, virtual_ride, cyclocross, downhill_biking, track_cycling, recumbent_cycling, bmx, e_bike_mountain, e_bike_fitness, hand_cycling, enduro_mtb |
| swimming | lap_swimming, open_water_swimming |
| walking | casual_walking, speed_walking |
| hiking | rucking |
| fitness_equipment | strength_training, elliptical, stair_climbing, indoor_rowing, pilates, yoga, indoor_climbing, bouldering, hiit, dance, jump_rope, mobility |
| winter_sports | resort_skiing, resort_snowboarding, backcountry_skiing, backcountry_snowboarding, cross_country_skiing_ws, skate_skiing_ws, snow_shoe_ws, skating_ws, snowmobiling_ws |
| diving | single_gas_diving, multi_gas_diving, gauge_diving, apnea_diving, apnea_hunting, ccr_diving, pool_apnea |
| water_sports | kayaking_v2, rowing_v2, sailing_v2, surfing_v2, stand_up_paddleboarding_v2, kiteboarding_v2, windsurfing_v2, snorkeling |
| team_sports | soccer, basketball, baseball, rugby, cricket, volleyball, ice_hockey, field_hockey, lacrosse, american_football, softball, ultimate_disc |
| racket_sports | tennis_v2, pickleball, badminton, squash, table_tennis, racquetball, paddelball, platform_tennis |
| multi_sport | (triathlon / duathlon parent) |
| other | breathwork, meditation, golf, boxing, mixed_martial_arts, rock_climbing, disc_golf, archery, mountaineering |

Use the parent type for broad queries (e.g. "swimming" for all pool + open water). Use a child type only when you need a specific sub-type.

## Return values

Return a structured object with the final answer. Include units in field names (e.g. distanceKm, durationMinutes). For analysis questions, return both the answer and supporting data.

{{example}}`;

export async function codeMcpServer(options: {
  server: McpServer;
  executor: DynamicWorkerExecutor;
}): Promise<McpServer> {
  const { server, executor } = options;
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "codemode-proxy", version: "1.0.0" });
  await client.connect(clientTransport);

  const { tools } = await client.listTools();

  const toolDescriptors: Record<
    string,
    { description?: string; inputSchema: Record<string, unknown> }
  > = {};
  for (const tool of tools) {
    toolDescriptors[tool.name] = {
      description: tool.description,
      inputSchema: tool.inputSchema,
    };
  }
  const types = generateTypesFromJsonSchema(toolDescriptors);

  const fns: Record<string, (args: unknown) => Promise<unknown>> = {};
  for (const tool of tools) {
    const toolName = tool.name;
    fns[toolName] = async (args: unknown) => {
      return unwrapMcpResult(
        await client.callTool({
          name: toolName,
          arguments: args as Record<string, unknown>,
        }),
      );
    };
  }

  const firstTool = tools[0];
  let example = "";
  if (firstTool) {
    const props = (firstTool.inputSchema.properties as Record<string, { type?: string }>) ?? {};
    const parts: string[] = [];
    for (const [key, prop] of Object.entries(props)) {
      if (prop.type === "number" || prop.type === "integer") parts.push(`${key}: 0`);
      else if (prop.type === "boolean") parts.push(`${key}: true`);
      else parts.push(`${key}: "..."`);
    }
    const args = parts.length > 0 ? `{ ${parts.join(", ")} }` : "{}";
    example = `Example: async () => { const r = await codemode.${sanitizeToolName(firstTool.name)}(${args}); return r; }`;
  }

  const description = CODE_DESCRIPTION.replace("{{types}}", types).replace("{{example}}", example);

  const codemodeServer = new McpServer({ name: "codemode", version: "1.0.0" });
  codemodeServer.registerTool(
    "code",
    {
      description,
      inputSchema: {
        code: z.string().describe("JavaScript async arrow function to execute"),
      },
    },
    async ({ code }) => {
      try {
        const result = await executor.execute(code, [{ name: "codemode", fns }]);
        if (result.error)
          return {
            content: [{ type: "text" as const, text: `Error: ${result.error}` }],
            isError: true,
          };
        return {
          content: [{ type: "text" as const, text: truncateResponse(result.result) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${formatError(error)}` }],
          isError: true,
        };
      }
    },
  );

  return codemodeServer;
}
