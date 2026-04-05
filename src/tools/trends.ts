import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type GarminApi, apiPath } from "../garmin-api.js";
import type {
  MaxMetricsEntry,
  StressData,
  BodyBatteryEntry,
  DailyStepsEntry,
  IntensityMinutes,
} from "../types/garmin-responses.js";

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

export function registerTrendsTools(server: McpServer, api: GarminApi): void {
  server.registerTool(
    "get_max_metrics",
    {
      description:
        "Get VO2 max and fitness age for a date. Returns an array where each entry " +
        "has generic (with vo2MaxValue, vo2MaxPreciseValue, fitnessAge, " +
        "fitnessAgeDescription), cycling (same shape or null), and " +
        "heatAltitudeAcclimation data.",
      inputSchema: { date: dateParam },
    },
    async ({ date }) => {
      const data = await api.get<MaxMetricsEntry[]>(
        apiPath`/metrics-service/metrics/maxmet/daily/${date}/${date}`,
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "get_stress_data",
    {
      description:
        "Get all-day stress data for a date. Returns avgStressLevel, maxStressLevel, " +
        "stressValuesArray (timestamped stress levels 0-100), and " +
        "bodyBatteryValuesArray.",
      inputSchema: { date: dateParam },
    },
    async ({ date }) => {
      const data = await api.get<StressData>(
        apiPath`/wellness-service/wellness/dailyStress/${date}`,
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "get_body_battery",
    {
      description:
        "Get Body Battery levels over a date range. Returns an array where each day " +
        "has charged, drained, and bodyBatteryValuesArray (timestamped readings).",
      inputSchema: {
        startDate: startDateParam,
        endDate: endDateParam,
      },
    },
    async ({ startDate, endDate }) => {
      const data = await api.get<BodyBatteryEntry[]>(
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
        "Get daily step counts over a date range. Returns an array where each day " +
        "has totalSteps, totalDistance (meters), and stepGoal.",
      inputSchema: {
        startDate: startDateParam,
        endDate: endDateParam,
      },
    },
    async ({ startDate, endDate }) => {
      const data = await api.get<DailyStepsEntry[]>(
        apiPath`/usersummary-service/stats/steps/daily/${startDate}/${endDate}`,
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "get_intensity_minutes",
    {
      description:
        "Get intensity minutes for a date. Returns moderateMinutes, vigorousMinutes, " +
        "weeklyModerate, weeklyVigorous, weeklyTotal, weekGoal, and dayOfGoalMet.",
      inputSchema: { date: dateParam },
    },
    async ({ date }) => {
      const data = await api.get<IntensityMinutes>(
        apiPath`/wellness-service/wellness/daily/im/${date}`,
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );
}
