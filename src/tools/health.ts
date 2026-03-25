import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GarminApi } from "../garmin-api.js";

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
        "Get sleep data for a date. Returns sleep stages (deep, light, REM, awake), " +
        "total duration, sleep score, and start/end times.",
      inputSchema: { date: dateParam },
    },
    async ({ date }) => {
      const displayName = await api.getDisplayName();
      const data = await api.get(
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
        "Get all-day heart rate data for a date. Returns timestamped HR samples, " +
        "min/max HR, and resting heart rate.",
      inputSchema: { date: dateParam },
    },
    async ({ date }) => {
      const displayName = await api.getDisplayName();
      const data = await api.get(
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
        "Get heart rate variability data for a date. Returns overnight HRV status, " +
        "average HRV, and baseline range. Key recovery metric.",
      inputSchema: { date: dateParam },
    },
    async ({ date }) => {
      const data = await api.get(`/hrv-service/hrv/${date}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "get_training_readiness",
    {
      description:
        "Get training readiness score for a date. Returns score (0-100) and " +
        "contributing factors: sleep, recovery, training load.",
      inputSchema: { date: dateParam },
    },
    async ({ date }) => {
      const data = await api.get(
        `/metrics-service/metrics/trainingreadiness/${date}`,
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "get_training_status",
    {
      description:
        "Get aggregated training status for a date. Returns training load, status " +
        "label (productive, maintaining, detraining), and VO2 max trend.",
      inputSchema: { date: dateParam },
    },
    async ({ date }) => {
      const data = await api.get(
        `/metrics-service/metrics/trainingstatus/aggregated/${date}`,
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );
}
