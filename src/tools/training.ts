import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GarminApi } from "../garmin-api.js";
import type {
  TrainingPlansResponse,
  WorkoutSummary,
  WorkoutDetail,
  RacePredictions,
  EnduranceScore,
  HillScore,
} from "../types/garmin-responses.js";

const startDateParam = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe("Start date in YYYY-MM-DD format");

const endDateParam = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe("End date in YYYY-MM-DD format");

export function registerTrainingTools(server: McpServer, api: GarminApi): void {
  // --- Read tools ---

  server.registerTool(
    "get_training_plans",
    {
      description:
        "List all training plans on Garmin Connect. Returns an object with " +
        "trainingPlanList (array of plans with names, types, statuses, IDs) " +
        "and searchFilter. Use before get_training_plan for details.",
      inputSchema: {},
    },
    async () => {
      const data = await api.get<TrainingPlansResponse>("/trainingplan-service/trainingplan/plans");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "get_training_plan",
    {
      description:
        "Get details for a specific training plan. Returns scheduled workouts, " +
        "phases, and progress within the plan.",
      inputSchema: {
        planId: z.string().describe("The training plan ID"),
      },
    },
    async ({ planId }) => {
      const data = await api.get(`/trainingplan-service/trainingplan/phased/${planId}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "get_workouts",
    {
      description:
        "List workouts in the Garmin workout library. Returns an array where each " +
        "element has workoutId, workoutName, sportType, estimatedDurationInSecs, " +
        "estimatedDistanceInMeters, and shared. Use before get_workout for full details.",
      inputSchema: {
        start: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Max results to return (default 20, max 100)"),
      },
    },
    async ({ start, limit }) => {
      const query: Record<string, string | number> = {};
      if (start !== undefined) query.start = start;
      if (limit !== undefined) query.limit = limit;

      const data = await api.get<WorkoutSummary[]>("/workout-service/workouts", query);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "get_workout",
    {
      description:
        "Get full details for a single workout. Returns workoutId, workoutName, " +
        "sportType, workoutSegments (array of segment objects with steps and targets), " +
        "estimatedDurationInSecs, and estimatedDistanceInMeters.",
      inputSchema: {
        workoutId: z.string().describe("The workout ID"),
      },
    },
    async ({ workoutId }) => {
      const data = await api.get<WorkoutDetail>(`/workout-service/workout/${workoutId}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "get_race_predictions",
    {
      description:
        "Get race time predictions based on recent training. Returns time5K, " +
        "time10K, timeHalfMarathon, and timeMarathon (all in seconds), plus " +
        "calendarDate and the prediction date range (fromCalendarDate, toCalendarDate).",
      inputSchema: {},
    },
    async () => {
      const displayName = await api.getDisplayName();
      const data = await api.get<RacePredictions>(
        `/metrics-service/metrics/racepredictions/latest/${displayName}`,
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "get_endurance_score",
    {
      description:
        "Get endurance score over a date range. Returns avg, max, " +
        "enduranceScoreDTO (detailed breakdown), and groupMap (scores grouped " +
        "by the aggregation period).",
      inputSchema: {
        startDate: startDateParam,
        endDate: endDateParam,
        aggregation: z
          .enum(["weekly", "monthly"])
          .optional()
          .describe("Aggregation period (default 'weekly')"),
      },
    },
    async ({ startDate, endDate, aggregation }) => {
      const data = await api.get<EnduranceScore>("/metrics-service/metrics/endurancescore/stats", {
        startDate,
        endDate,
        aggregation: aggregation ?? "weekly",
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "get_hill_score",
    {
      description:
        "Get the latest hill score. Returns overallScore, strengthScore, " +
        "enduranceScore, vo2Max, vo2MaxPreciseValue, and calendarDate. " +
        "Note: returns a single object (latest score), not a historical trend.",
      inputSchema: {
        startDate: startDateParam,
        endDate: endDateParam,
      },
    },
    async ({ startDate, endDate }) => {
      const data = await api.get<HillScore>("/metrics-service/metrics/hillscore", {
        startDate,
        endDate,
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  // --- Write tools ---

  server.registerTool(
    "create_workout",
    {
      description:
        "Create a new workout on Garmin Connect. Accepts a JSON workout object " +
        "with workoutName, sportType, and workoutSegments. Returns the created " +
        "workout with its assigned workoutId.",
      inputSchema: {
        workout: z
          .string()
          .describe(
            "JSON string of the Garmin workout object containing workoutName, sportType, and workoutSegments",
          ),
      },
    },
    async ({ workout }) => {
      const body = JSON.parse(workout);
      const data = await api.post<WorkoutDetail>("/workout-service/workout", body);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "schedule_workout",
    {
      description:
        "Schedule an existing workout for a specific date. Requires a workoutId " +
        "from get_workouts or create_workout. Returns the scheduled entry.",
      inputSchema: {
        workoutId: z.string().describe("The workout ID to schedule"),
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .describe("Schedule date in YYYY-MM-DD format"),
      },
    },
    async ({ workoutId, date }) => {
      const data = await api.post(`/workout-service/schedule/${workoutId}`, { date });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "delete_workout",
    {
      description: "Delete a workout from Garmin Connect. This is permanent and cannot be undone.",
      inputSchema: {
        workoutId: z.string().describe("The workout ID to delete"),
      },
    },
    async ({ workoutId }) => {
      await api.delete(`/workout-service/workout/${workoutId}`);
      return {
        content: [{ type: "text", text: JSON.stringify({ deleted: true, workoutId }) }],
      };
    },
  );
}
