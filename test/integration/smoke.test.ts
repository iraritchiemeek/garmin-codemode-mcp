/**
 * Integration smoke tests — hit the real Garmin Connect API to verify
 * every endpoint returns a 2xx. Requires GARMIN_OAUTH1 and GARMIN_OAUTH2
 * env vars with valid credentials. Skipped when env vars are missing.
 *
 * Run: pnpm test:integration
 */
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { GarminApi } from "../../src/garmin-api.js";

const hasCredentials =
  !!process.env.GARMIN_OAUTH1 && !!process.env.GARMIN_OAUTH2;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe.skipIf(!hasCredentials)("Garmin API smoke tests", () => {
  let api: GarminApi;
  let activityId: string;
  const yesterday = new Date(Date.now() - 86_400_000)
    .toISOString()
    .slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  beforeAll(async () => {
    api = new GarminApi(
      process.env.GARMIN_OAUTH1!,
      process.env.GARMIN_OAUTH2!,
    );
    // Fetch a recent activity ID for tests that need one
    const activities = await api.get<Array<{ activityId: number }>>(
      "/activitylist-service/activities/search/activities",
      { limit: 1 },
    );
    activityId = String(activities[0].activityId);
  });

  afterEach(async () => {
    await sleep(500);
  });

  // --- Activities ---

  it("list_activities", async () => {
    const data = await api.get(
      "/activitylist-service/activities/search/activities",
      { limit: 1 },
    );
    expect(data).toBeDefined();
  });

  it("get_activity", async () => {
    const data = await api.get(`/activity-service/activity/${activityId}`);
    expect(data).toBeDefined();
  });

  it("get_activity_details", async () => {
    const data = await api.get(
      `/activity-service/activity/${activityId}/details`,
    );
    expect(data).toBeDefined();
  });

  it("get_activity_splits", async () => {
    const data = await api.get(
      `/activity-service/activity/${activityId}/splits`,
    );
    expect(data).toBeDefined();
  });

  it("get_activity_hr_zones", async () => {
    const data = await api.get(
      `/activity-service/activity/${activityId}/hrTimeInZones`,
    );
    expect(data).toBeDefined();
  });

  it("get_activity_weather", async () => {
    const data = await api.get(
      `/activity-service/activity/${activityId}/weather`,
    );
    expect(data).toBeDefined();
  });

  it("get_activity_gear", async () => {
    const data = await api.get("/gear-service/gear/filterGear", {
      activityId,
    });
    expect(data).toBeDefined();
  });

  it("get_activities_by_date", async () => {
    const data = await api.get(
      "/activitylist-service/activities/search/activities",
      { startDate: weekAgo, endDate: yesterday },
    );
    expect(data).toBeDefined();
  });

  it("get_activity_types", async () => {
    const data = await api.get("/activity-service/activity/activityTypes");
    expect(data).toBeDefined();
  });

  // --- Health ---

  it("get_sleep_data", async () => {
    const displayName = await api.getDisplayName();
    const data = await api.get(
      `/wellness-service/wellness/dailySleepData/${displayName}`,
      { date: yesterday, nonSleepBufferMinutes: 60 },
    );
    expect(data).toBeDefined();
  });

  it("get_heart_rates", async () => {
    const displayName = await api.getDisplayName();
    const data = await api.get(
      `/wellness-service/wellness/dailyHeartRate/${displayName}`,
      { date: yesterday },
    );
    expect(data).toBeDefined();
  });

  it("get_hrv_data", async () => {
    const data = await api.get(`/hrv-service/hrv/${yesterday}`);
    expect(data).toBeDefined();
  });

  it("get_training_readiness", async () => {
    const data = await api.get(
      `/metrics-service/metrics/trainingreadiness/${yesterday}`,
    );
    expect(data).toBeDefined();
  });

  it("get_training_status", async () => {
    const data = await api.get(
      `/metrics-service/metrics/trainingstatus/aggregated/${yesterday}`,
    );
    expect(data).toBeDefined();
  });

  // --- Trends ---

  it("get_max_metrics", async () => {
    const data = await api.get(
      `/metrics-service/metrics/maxmet/daily/${yesterday}/${yesterday}`,
    );
    expect(data).toBeDefined();
  });

  it("get_stress_data", async () => {
    const data = await api.get(
      `/wellness-service/wellness/dailyStress/${yesterday}`,
    );
    expect(data).toBeDefined();
  });

  it("get_body_battery", async () => {
    const data = await api.get(
      "/wellness-service/wellness/bodyBattery/reports/daily",
      { startDate: weekAgo, endDate: yesterday },
    );
    expect(data).toBeDefined();
  });

  it("get_daily_steps", async () => {
    const data = await api.get(
      `/usersummary-service/stats/steps/daily/${weekAgo}/${yesterday}`,
    );
    expect(data).toBeDefined();
  });

  it("get_intensity_minutes", async () => {
    const data = await api.get(
      `/wellness-service/wellness/daily/im/${yesterday}`,
    );
    expect(data).toBeDefined();
  });

  // --- Training ---

  it("get_training_plans", async () => {
    const data = await api.get(
      "/trainingplan-service/trainingplan/plans",
    );
    expect(data).toBeDefined();
  });

  it("get_workouts", async () => {
    const data = await api.get("/workout-service/workouts", { limit: 1 });
    expect(data).toBeDefined();
  });

  it("get_race_predictions", async () => {
    const displayName = await api.getDisplayName();
    const data = await api.get(
      `/metrics-service/metrics/racepredictions/latest/${displayName}`,
    );
    expect(data).toBeDefined();
  });

  it("get_endurance_score", async () => {
    const data = await api.get(
      "/metrics-service/metrics/endurancescore/stats",
      { startDate: weekAgo, endDate: yesterday, aggregation: "weekly" },
    );
    expect(data).toBeDefined();
  });

  it("get_hill_score", async () => {
    const data = await api.get("/metrics-service/metrics/hillscore", {
      startDate: weekAgo,
      endDate: yesterday,
    });
    expect(data).toBeDefined();
  });
});
