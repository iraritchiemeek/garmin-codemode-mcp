import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GarminApi } from "../garmin-api.js";
import type {
  ActivitySummary,
  ActivityDetail,
  ActivityMetrics,
  ActivitySplits,
  HrZone,
  ActivityWeather,
  GearItem,
  GearStats,
  ActivityTypeEntry,
} from "../types/garmin-responses.js";

export function registerActivityTools(
  server: McpServer,
  api: GarminApi,
): void {
  server.registerTool(
    "list_activities",
    {
      description:
        "Search Garmin Connect activities. Returns an array of activity summaries " +
        "including activityId, activityName, activityType (with typeKey), startTimeLocal, " +
        "duration, distance (in meters), averageHR, maxHR, and calories. " +
        "Note: 'running' and 'trail_running' are separate activity types — " +
        "query both if you want all runs. Omit activityType to get all activities.",
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
            "Filter by activity type key. Types are specific: 'running' excludes 'trail_running', " +
            "'cycling' excludes 'mountain_biking', etc. Use get_activity_types for the full list.",
          ),
      },
    },
    async ({ start, limit, activityType }) => {
      const query: Record<string, string | number> = {};
      if (start !== undefined) query.start = start;
      if (limit !== undefined) query.limit = limit;
      if (activityType) query.activityType = activityType;

      const data = await api.get<ActivitySummary[]>(
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
        "Get the full summary for a single Garmin activity by ID. Returns an object " +
        "with activityId, activityName, summaryDTO (aggregated stats), activityTypeDTO, " +
        "eventTypeDTO, metadataDTO, and timeZoneUnitDTO. " +
        "Use after list_activities to get detailed info about a specific activity.",
      inputSchema: {
        activityId: z
          .string()
          .describe("The activity ID from list_activities results"),
      },
    },
    async ({ activityId }) => {
      const data = await api.get<ActivityDetail>(
        `/activity-service/activity/${activityId}`,
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "get_activity_details",
    {
      description:
        "Get time-series metric data for a Garmin activity. Returns activityDetailMetrics " +
        "(sampled data points), metricDescriptors (what each metric column means), " +
        "heartRateDTOs, and geoPolylineDTO. Essential for analysing HR trends, " +
        "elevation profiles, and pace variation.",
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

      const data = await api.get<ActivityMetrics>(
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
        "Get per-split data for a Garmin activity. Returns an object with lapDTOs " +
        "(array of lap/split objects with distance, duration, pace, HR) and eventDTOs. " +
        "Useful for pacing and effort analysis.",
      inputSchema: {
        activityId: z
          .string()
          .describe("The activity ID"),
      },
    },
    async ({ activityId }) => {
      const data = await api.get<ActivitySplits>(
        `/activity-service/activity/${activityId}/splits`,
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "get_activity_hr_zones",
    {
      description:
        "Get heart rate time-in-zones for a Garmin activity. Returns an array where " +
        "each element has zoneNumber, secsInZone, and zoneLowBoundary. " +
        "Use this for HR distribution analysis.",
      inputSchema: {
        activityId: z
          .string()
          .describe("The activity ID"),
      },
    },
    async ({ activityId }) => {
      const data = await api.get<HrZone[]>(
        `/activity-service/activity/${activityId}/hrTimeInZones`,
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "get_activity_weather",
    {
      description:
        "Get weather conditions during a Garmin activity. Returns an object with " +
        "temp, apparentTemp, dewPoint, relativeHumidity, windSpeed, windGust, " +
        "windDirection, windDirectionCompassPoint, and weatherTypeDTO. " +
        "Useful for correlating performance with environmental conditions.",
      inputSchema: {
        activityId: z
          .string()
          .describe("The activity ID"),
      },
    },
    async ({ activityId }) => {
      const data = await api.get<ActivityWeather>(
        `/activity-service/activity/${activityId}/weather`,
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "get_activity_gear",
    {
      description:
        "Get gear used for a Garmin activity. Returns an array of gear objects. " +
        "Each has: customMakeModel (the user-entered gear name, e.g. 'Altra Lone Peak 9+'), " +
        "displayName (often null), gearTypeName ('Shoes'/'Bike'/etc.), gearPk (gear ID), " +
        "uuid, gearStatusName, dateBegin, maximumMeters. " +
        "Search customMakeModel for gear matching — displayName is usually null.",
      inputSchema: {
        activityId: z
          .string()
          .describe("The activity ID"),
      },
    },
    async ({ activityId }) => {
      const data = await api.get<GearItem[]>(
        "/gear-service/gear/filterGear",
        { activityId },
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "list_gear",
    {
      description:
        "List all gear registered in the user's Garmin account. Returns an array " +
        "of gear objects with: uuid, customMakeModel (user-entered name like " +
        "'Altra Lone Peak 9+'), displayName (often null), gearTypeName ('Shoes'/'Bike'/etc.), " +
        "gearPk, gearStatusName ('active'/'retired'), dateBegin, maximumMeters. " +
        "Use this to find a gear item's uuid before calling get_gear_stats.",
      inputSchema: {},
    },
    async () => {
      const userProfilePk = await api.getUserProfilePk();
      const data = await api.get<GearItem[]>("/gear-service/gear/filterGear", {
        userProfilePk,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "get_gear_stats",
    {
      description:
        "Get aggregate usage statistics for a specific gear item. Returns totalDistance " +
        "(meters) and totalActivities count only — does NOT return individual activity " +
        "details. Use list_gear first to find the gear uuid.",
      inputSchema: {
        gearUuid: z
          .string()
          .describe("The gear uuid from list_gear results"),
      },
    },
    async ({ gearUuid }) => {
      const data = await api.get<GearStats>(`/gear-service/gear/stats/${gearUuid}`);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "get_activities_by_date",
    {
      description:
        "Search activities within a date range. Returns same array of activity summaries " +
        "as list_activities (activityId, activityName, distance, duration, etc.). " +
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
            "Filter by activity type key. Types are specific: 'running' excludes 'trail_running', etc.",
          ),
      },
    },
    async ({ startDate, endDate, activityType }) => {
      const query: Record<string, string | number> = {
        startDate,
        endDate,
      };
      if (activityType) query.activityType = activityType;

      const data = await api.get<ActivitySummary[]>(
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
        "List all Garmin activity types. Returns an array where each element has " +
        "typeKey (e.g. 'running', 'trail_running') and typeId. Use to discover " +
        "valid activityType filter values for list_activities and get_activities_by_date.",
      inputSchema: {},
    },
    async () => {
      const data = await api.get<ActivityTypeEntry[]>(
        "/activity-service/activity/activityTypes",
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );
}
