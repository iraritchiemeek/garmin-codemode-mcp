import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GarminApi } from "../garmin-api.js";
import type {
  SleepData,
  HeartRateData,
  HrvData,
  TrainingReadinessEntry,
  TrainingStatus,
} from "../types/garmin-responses.js";

const dateParam = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe("Date in YYYY-MM-DD format");

export function registerHealthTools(
  server: McpServer,
  api: GarminApi,
): void {
  server.registerTool(
    "get_sleep_data",
    {
      description:
        "Get sleep data for a date. Returns dailySleepDTO (sleep stages, duration, " +
        "score, start/end times), sleepLevels, sleepMovement, sleepHeartRate, " +
        "restingHeartRate, avgOvernightHrv, hrvStatus, bodyBatteryChange, and " +
        "skin temperature deviation.",
      inputSchema: { date: dateParam },
    },
    async ({ date }) => {
      const displayName = await api.getDisplayName();
      const data = await api.get<SleepData>(
        `/wellness-service/wellness/dailySleepData/${displayName}`,
        { date, nonSleepBufferMinutes: 60 },
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "get_heart_rates",
    {
      description:
        "Get all-day heart rate data for a date. Returns timestamped heartRateValues " +
        "array, maxHeartRate, minHeartRate, restingHeartRate, and " +
        "lastSevenDaysAvgRestingHeartRate.",
      inputSchema: { date: dateParam },
    },
    async ({ date }) => {
      const displayName = await api.getDisplayName();
      const data = await api.get<HeartRateData>(
        `/wellness-service/wellness/dailyHeartRate/${displayName}`,
        { date },
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "get_hrv_data",
    {
      description:
        "Get heart rate variability data for a date. Returns hrvSummary (overnight " +
        "HRV status, average, baseline range), hrvReadings (timestamped samples), " +
        "and sleep start/end timestamps. Key recovery metric.",
      inputSchema: { date: dateParam },
    },
    async ({ date }) => {
      const data = await api.get<HrvData>(`/hrv-service/hrv/${date}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "get_training_readiness",
    {
      description:
        "Get training readiness score for a date. Returns an array with one entry " +
        "containing: score (0-100), level, feedbackShort, feedbackLong, and " +
        "contributing factor percentages for sleep (sleepScoreFactorPercent), " +
        "recovery time (recoveryTimeFactorPercent), HRV (hrvFactorPercent), " +
        "and acute load (acwrFactorPercent).",
      inputSchema: { date: dateParam },
    },
    async ({ date }) => {
      const data = await api.get<TrainingReadinessEntry[]>(
        `/metrics-service/metrics/trainingreadiness/${date}`,
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "get_training_status",
    {
      description:
        "Get aggregated training status for a date. Returns an object with nested " +
        "DTOs: mostRecentTrainingStatus (status label like productive/maintaining/" +
        "detraining), mostRecentVO2Max (VO2 max values and trend), " +
        "mostRecentTrainingLoadBalance (load metrics), and " +
        "heatAltitudeAcclimationDTO.",
      inputSchema: { date: dateParam },
    },
    async ({ date }) => {
      const data = await api.get<TrainingStatus>(
        `/metrics-service/metrics/trainingstatus/aggregated/${date}`,
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );
}
