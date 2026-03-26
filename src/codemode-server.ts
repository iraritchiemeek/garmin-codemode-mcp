/**
 * Local patched codeMcpServer — unwraps MCP content responses before they
 * reach the sandbox. Drop this file when cloudflare/agents#1203 is fixed.
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
import { outputSchemas } from "./types/output-schemas.js";

const CHARS_PER_TOKEN = 4;
const MAX_TOKENS = 6_000;
const MAX_CHARS = MAX_TOKENS * CHARS_PER_TOKEN;

function truncateResponse(content: unknown): string {
  const text =
    typeof content === "string"
      ? content
      : (JSON.stringify(content, null, 2) ?? "undefined");
  if (text.length <= MAX_CHARS) return text;
  return `${text.slice(0, MAX_CHARS)}\n\n--- TRUNCATED ---\nResponse was ~${Math.ceil(text.length / CHARS_PER_TOKEN).toLocaleString()} tokens (limit: ${MAX_TOKENS.toLocaleString()}). Use more specific queries to reduce response size.`;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function unwrapMcpResponse(result: unknown): unknown {
  if (
    result &&
    typeof result === "object" &&
    "content" in result &&
    Array.isArray(
      (result as { content: unknown[] }).content,
    )
  ) {
    const content = (
      result as { content: Array<{ type: string; text?: string }> }
    ).content;
    if (
      content.length === 1 &&
      content[0].type === "text" &&
      typeof content[0].text === "string"
    ) {
      try {
        return JSON.parse(content[0].text);
      } catch {
        return content[0].text;
      }
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

## Return values

Return a structured object with the final answer. Include units in field names (e.g. distanceKm, durationMinutes). For analysis questions, return both the answer and supporting data.

{{example}}`;

export async function codeMcpServer(options: {
  server: McpServer;
  executor: DynamicWorkerExecutor;
}): Promise<McpServer> {
  const { server, executor } = options;
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "codemode-proxy", version: "1.0.0" });
  await client.connect(clientTransport);

  const { tools } = await client.listTools();

  const toolDescriptors: Record<
    string,
    { description?: string; inputSchema: Record<string, unknown>; outputSchema?: Record<string, unknown> }
  > = {};
  for (const tool of tools) {
    toolDescriptors[tool.name] = {
      description: tool.description,
      inputSchema: tool.inputSchema,
      outputSchema: outputSchemas[tool.name],
    };
  }
  const types = generateTypesFromJsonSchema(toolDescriptors);

  const fns: Record<string, (args: unknown) => Promise<unknown>> = {};
  for (const tool of tools) {
    const toolName = tool.name;
    fns[toolName] = async (args: unknown) => {
      const result = await client.callTool({
        name: toolName,
        arguments: args as Record<string, unknown>,
      });
      return unwrapMcpResponse(result); // <-- the fix
    };
  }

  const firstTool = tools[0];
  let example = "";
  if (firstTool) {
    const props =
      (firstTool.inputSchema.properties as Record<
        string,
        { type?: string }
      >) ?? {};
    const parts: string[] = [];
    for (const [key, prop] of Object.entries(props)) {
      if (prop.type === "number" || prop.type === "integer")
        parts.push(`${key}: 0`);
      else if (prop.type === "boolean") parts.push(`${key}: true`);
      else parts.push(`${key}: "..."`);
    }
    const args = parts.length > 0 ? `{ ${parts.join(", ")} }` : "{}";
    example = `Example: async () => { const r = await codemode.${sanitizeToolName(firstTool.name)}(${args}); return r; }`;
  }

  const description = CODE_DESCRIPTION.replace("{{types}}", types).replace(
    "{{example}}",
    example,
  );

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
        const result = await executor.execute(code, [
          { name: "codemode", fns },
        ]);
        if (result.error)
          return {
            content: [
              { type: "text" as const, text: `Error: ${result.error}` },
            ],
            isError: true,
          };
        return {
          content: [
            { type: "text" as const, text: truncateResponse(result.result) },
          ],
        };
      } catch (error) {
        return {
          content: [
            { type: "text" as const, text: `Error: ${formatError(error)}` },
          ],
          isError: true,
        };
      }
    },
  );

  return codemodeServer;
}
