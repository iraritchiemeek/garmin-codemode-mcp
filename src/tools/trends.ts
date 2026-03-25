import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GarminApi } from "../garmin-api.js";

const dateParam = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe("Date in YYYY-MM-DD format");

const startDateParam = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe("Start date in YYYY-MM-DD format");

const endDateParam = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe("End date in YYYY-MM-DD format");

export function registerTrendsTools(
  server: McpServer,
  api: GarminApi,
): void {
  server.registerTool(
    "get_max_metrics",
    {
      description:
        "Get VO2 max and fitness age for a date. Returns estimated VO2 max " +
        "(running/cycling), fitness age, and max met values.",
      inputSchema: { date: dateParam },
    },
    async ({ date }) => {
      const data = await api.get(
        `/metrics-service/metrics/maxmet/daily/${date}/${date}`,
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "get_stress_data",
    {
      description:
        "Get all-day stress data for a date. Returns timestamped stress levels " +
        "(0-100), overall score, and rest/activity breakdown.",
      inputSchema: { date: dateParam },
    },
    async ({ date }) => {
      const data = await api.get(
        `/wellness-service/wellness/dailyStress/${date}`,
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "get_body_battery",
    {
      description:
        "Get Body Battery levels over a date range. Returns daily charged/drained " +
        "values and high/low readings. Use for energy trend analysis.",
      inputSchema: {
        startDate: startDateParam,
        endDate: endDateParam,
      },
    },
    async ({ startDate, endDate }) => {
      const data = await api.get(
        "/wellness-service/wellness/bodyBattery/reports/daily",
        { startDate, endDate },
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "get_daily_steps",
    {
      description:
        "Get daily step counts over a date range. Returns steps, distance, " +
        "calories, and active minutes per day.",
      inputSchema: {
        startDate: startDateParam,
        endDate: endDateParam,
      },
    },
    async ({ startDate, endDate }) => {
      const data = await api.get(
        `/usersummary-service/stats/steps/daily/${startDate}/${endDate}`,
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "get_intensity_minutes",
    {
      description:
        "Get intensity minutes for a date. Returns moderate and vigorous minutes, " +
        "weekly totals, and goal progress.",
      inputSchema: { date: dateParam },
    },
    async ({ date }) => {
      const data = await api.get(
        `/wellness-service/wellness/daily/im/${date}`,
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );
}
