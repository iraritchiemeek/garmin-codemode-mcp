import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GarminApi } from "../garmin-api.js";

export function registerActivityTools(
  server: McpServer,
  api: GarminApi,
): void {
  server.registerTool(
    "list_activities",
    {
      description:
        "Search Garmin Connect activities. Returns an array of activity summaries " +
        "including activityId, activityName, activityType, startTimeLocal, duration, " +
        "distance, averageHR, maxHR, and calories. Use this to find activities by " +
        "type or browse recent activities before fetching details.",
      inputSchema: {
        start: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Pagination offset, 0 = most recent (default 0)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Max results to return (default 20, max 100)"),
        activityType: z
          .string()
          .optional()
          .describe(
            "Filter by activity type key, e.g. 'running', 'trail_running', 'cycling', 'hiking', 'swimming'",
          ),
      },
    },
    async ({ start, limit, activityType }) => {
      const query: Record<string, string | number> = {};
      if (start !== undefined) query.start = start;
      if (limit !== undefined) query.limit = limit;
      if (activityType) query.activityType = activityType;

      const data = await api.get(
        "/activitylist-service/activities/search/activities",
        query,
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "get_activity",
    {
      description:
        "Get the full summary for a single Garmin activity by ID. Includes " +
        "aggregated stats, activity type, timestamps, and basic split data. " +
        "Use after list_activities to get detailed info about a specific activity.",
      inputSchema: {
        activityId: z
          .string()
          .describe("The activity ID from list_activities results"),
      },
    },
    async ({ activityId }) => {
      const data = await api.get(
        `/activity-service/activity/${activityId}`,
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "get_activity_details",
    {
      description:
        "Get time-series data for a Garmin activity: heart rate, elevation, " +
        "pace, cadence, and other metrics sampled over the duration. Essential " +
        "for analysing HR trends, elevation profiles, and pace variation.",
      inputSchema: {
        activityId: z
          .string()
          .describe("The activity ID"),
        maxChartSize: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("Max data points for chart metrics (default 2000)"),
        maxPolylineSize: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Max GPS polyline points (default 4000)"),
      },
    },
    async ({ activityId, maxChartSize, maxPolylineSize }) => {
      const query: Record<string, string | number> = {};
      if (maxChartSize !== undefined) query.maxChartSize = maxChartSize;
      if (maxPolylineSize !== undefined) query.maxPolylineSize = maxPolylineSize;

      const data = await api.get(
        `/activity-service/activity/${activityId}/details`,
        query,
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "get_activity_splits",
    {
      description:
        "Get per-split data for a Garmin activity: distance, duration, " +
        "average pace, and average HR for each split (typically per km or mile). " +
        "Useful for pacing and effort analysis.",
      inputSchema: {
        activityId: z
          .string()
          .describe("The activity ID"),
      },
    },
    async ({ activityId }) => {
      const data = await api.get(
        `/activity-service/activity/${activityId}/splits`,
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "get_activity_hr_zones",
    {
      description:
        "Get heart rate time-in-zones for a Garmin activity. Shows seconds " +
        "spent in each HR zone (zone 1 through zone 5) and zone boundaries. " +
        "Use this for HR distribution analysis.",
      inputSchema: {
        activityId: z
          .string()
          .describe("The activity ID"),
      },
    },
    async ({ activityId }) => {
      const data = await api.get(
        `/activity-service/activity/${activityId}/hrTimeInZones`,
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "get_activity_weather",
    {
      description:
        "Get weather conditions during a Garmin activity. Returns temperature, " +
        "humidity, wind speed/direction, and weather type. Useful for correlating " +
        "performance with environmental conditions.",
      inputSchema: {
        activityId: z
          .string()
          .describe("The activity ID"),
      },
    },
    async ({ activityId }) => {
      const data = await api.get(
        `/activity-service/activity/${activityId}/weather`,
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "get_activity_gear",
    {
      description:
        "Get gear used for a Garmin activity. Returns linked equipment (shoes, " +
        "bike, etc.) with name, type, and usage stats. Use to track equipment mileage.",
      inputSchema: {
        activityId: z
          .string()
          .describe("The activity ID"),
      },
    },
    async ({ activityId }) => {
      const data = await api.get(
        "/gear-service/gear/filterGear",
        { activityId },
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "get_activities_by_date",
    {
      description:
        "Search activities within a date range. Returns array of activity summaries. " +
        "Use instead of list_activities when you need activities from a specific period.",
      inputSchema: {
        startDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .describe("Start date in YYYY-MM-DD format"),
        endDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .describe("End date in YYYY-MM-DD format"),
        activityType: z
          .string()
          .optional()
          .describe(
            "Filter by activity type key, e.g. 'running', 'hiking', 'swimming'",
          ),
      },
    },
    async ({ startDate, endDate, activityType }) => {
      const query: Record<string, string | number> = {
        startDate,
        endDate,
      };
      if (activityType) query.activityType = activityType;

      const data = await api.get(
        "/activitylist-service/activities/search/activities",
        query,
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "get_activity_types",
    {
      description:
        "List all Garmin activity types with typeKey and typeId. Use to discover " +
        "valid activityType filter values for list_activities and get_activities_by_date.",
      inputSchema: {},
    },
    async () => {
      const data = await api.get(
        "/activity-service/activity/activityTypes",
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );
}
