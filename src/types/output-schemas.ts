/**
 * JSON Schema definitions for tool output types.
 * These are fed to generateTypesFromJsonSchema so the LLM sees typed
 * return values instead of `unknown` in the codemode prompt.
 *
 * Derived from live Garmin Connect API responses.
 */

type JsonSchema = Record<string, unknown>;

/** Reusable schema fragments. */
const gearItemSchema: JsonSchema = {
  type: "object",
  properties: {
    gearPk: { type: "number" },
    uuid: { type: "string" },
    userProfilePk: { type: "number" },
    gearMakeName: { type: "string" },
    gearModelName: { type: "string" },
    gearTypeName: { type: "string" },
    gearStatusName: { type: "string" },
    displayName: { type: ["string", "null"] },
    customMakeModel: { type: "string" },
    dateBegin: { type: "string" },
    dateEnd: { type: ["string", "null"] },
    maximumMeters: { type: "number" },
  },
};

const activitySummarySchema: JsonSchema = {
  type: "object",
  properties: {
    activityId: { type: "number" },
    activityName: { type: "string" },
    activityType: {
      type: "object",
      properties: {
        typeId: { type: "number" },
        typeKey: { type: "string" },
      },
    },
    startTimeLocal: { type: "string" },
    startTimeGMT: { type: "string" },
    duration: { type: "number", description: "seconds" },
    distance: { type: "number", description: "meters" },
    elevationGain: { type: "number", description: "meters" },
    elevationLoss: { type: "number", description: "meters" },
    averageSpeed: { type: "number" },
    maxSpeed: { type: "number" },
    averageHR: { type: "number" },
    maxHR: { type: "number" },
    calories: { type: "number" },
    steps: { type: "number" },
    locationName: { type: "string" },
    movingDuration: { type: "number" },
    elapsedDuration: { type: "number" },
    lapCount: { type: "number" },
  },
};

export const outputSchemas: Record<string, JsonSchema> = {
  // ─── Activities ──────────────────────────────────────────────────────

  list_activities: {
    type: "array",
    items: activitySummarySchema,
  },

  get_activity: {
    type: "object",
    properties: {
      activityId: { type: "number" },
      activityName: { type: "string" },
      activityUUID: { type: "string" },
      locationName: { type: "string" },
      userProfileId: { type: "number" },
      isMultiSportParent: { type: "boolean" },
      activityTypeDTO: { type: "object" },
      eventTypeDTO: { type: "object" },
      summaryDTO: { type: "object", description: "Aggregated stats (distance, duration, HR, calories, etc.)" },
      metadataDTO: { type: "object" },
      timeZoneUnitDTO: { type: "object" },
    },
  },

  get_activity_details: {
    type: "object",
    properties: {
      activityId: { type: "number" },
      measurementCount: { type: "number" },
      metricsCount: { type: "number" },
      detailsAvailable: { type: "boolean" },
      metricDescriptors: { type: "array", description: "What each metric column means" },
      activityDetailMetrics: { type: "array", description: "Sampled data points" },
      heartRateDTOs: { type: ["array", "null"] },
      geoPolylineDTO: { type: ["object", "null"] },
    },
  },

  get_activity_splits: {
    type: "object",
    properties: {
      activityId: { type: "number" },
      lapDTOs: { type: "array", description: "Per-split data with distance, duration, pace, HR" },
      eventDTOs: { type: "array" },
    },
  },

  get_activity_hr_zones: {
    type: "array",
    items: {
      type: "object",
      properties: {
        zoneNumber: { type: "number" },
        secsInZone: { type: "number" },
        zoneLowBoundary: { type: "number" },
      },
    },
  },

  get_activity_weather: {
    type: "object",
    properties: {
      temp: { type: "number", description: "Celsius" },
      apparentTemp: { type: "number", description: "Celsius" },
      dewPoint: { type: "number" },
      relativeHumidity: { type: "number" },
      windSpeed: { type: "number" },
      windGust: { type: "number" },
      windDirection: { type: "number", description: "degrees" },
      windDirectionCompassPoint: { type: "string" },
      weatherTypeDTO: { type: "object" },
    },
  },

  get_activity_gear: {
    type: "array",
    items: gearItemSchema,
  },

  list_gear: {
    type: "array",
    items: gearItemSchema,
  },

  get_gear_stats: {
    type: "object",
    description: "Aggregate stats only — does NOT return individual activities",
    properties: {
      gearPk: { type: "number" },
      uuid: { type: "string" },
      totalDistance: { type: "number", description: "meters" },
      totalActivities: { type: "number" },
      isProcessing: { type: "boolean" },
    },
  },

  get_activities_by_date: {
    type: "array",
    items: activitySummarySchema,
  },

  get_activity_types: {
    type: "array",
    items: {
      type: "object",
      properties: {
        typeId: { type: "number" },
        typeKey: { type: "string" },
        parentTypeId: { type: "number" },
      },
    },
  },

  // ─── Health ──────────────────────────────────────────────────────────

  get_sleep_data: {
    type: "object",
    properties: {
      dailySleepDTO: { type: "object", description: "Sleep stages, duration, score, start/end times" },
      sleepLevels: { type: "array" },
      sleepMovement: { type: "array" },
      sleepHeartRate: { type: "array" },
      sleepStress: { type: "array" },
      restingHeartRate: { type: "number" },
      avgOvernightHrv: { type: "number" },
      hrvStatus: { type: "string" },
      bodyBatteryChange: { type: "number" },
      avgSkinTempDeviationC: { type: "number" },
    },
  },

  get_heart_rates: {
    type: "object",
    properties: {
      calendarDate: { type: "string" },
      maxHeartRate: { type: "number" },
      minHeartRate: { type: "number" },
      restingHeartRate: { type: "number" },
      lastSevenDaysAvgRestingHeartRate: { type: "number" },
      heartRateValues: { type: ["array", "null"], description: "Timestamped HR samples" },
    },
  },

  get_hrv_data: {
    type: "object",
    properties: {
      hrvSummary: { type: "object", description: "Overnight HRV status, average, baseline range" },
      hrvReadings: { type: "array", description: "Timestamped HRV samples" },
      sleepStartTimestampLocal: { type: "string" },
      sleepEndTimestampLocal: { type: "string" },
    },
  },

  get_training_readiness: {
    type: "array",
    items: {
      type: "object",
      properties: {
        calendarDate: { type: "string" },
        score: { type: "number", description: "0-100" },
        level: { type: "string" },
        feedbackShort: { type: "string" },
        feedbackLong: { type: "string" },
        sleepScore: { type: "number" },
        sleepScoreFactorPercent: { type: "number" },
        recoveryTime: { type: "number" },
        recoveryTimeFactorPercent: { type: "number" },
        hrvWeeklyAverage: { type: "number" },
        hrvFactorPercent: { type: "number" },
        acuteLoad: { type: "number" },
        acwrFactorPercent: { type: "number" },
      },
    },
  },

  get_training_status: {
    type: "object",
    properties: {
      userId: { type: "number" },
      mostRecentVO2Max: { type: "object", description: "VO2 max values and trend" },
      mostRecentTrainingStatus: { type: "object", description: "Status label (productive/maintaining/detraining)" },
      mostRecentTrainingLoadBalance: { type: "object", description: "Training load metrics" },
      heatAltitudeAcclimationDTO: { type: "object" },
    },
  },

  // ─── Trends ──────────────────────────────────────────────────────────

  get_max_metrics: {
    type: "array",
    items: {
      type: "object",
      properties: {
        userId: { type: "number" },
        generic: {
          type: ["object", "null"],
          properties: {
            calendarDate: { type: "string" },
            vo2MaxPreciseValue: { type: "number" },
            vo2MaxValue: { type: "number" },
            fitnessAge: { type: ["number", "null"] },
            fitnessAgeDescription: { type: ["string", "null"] },
          },
        },
        cycling: { type: ["object", "null"] },
        heatAltitudeAcclimation: { type: ["object", "null"] },
      },
    },
  },

  get_stress_data: {
    type: "object",
    properties: {
      calendarDate: { type: "string" },
      maxStressLevel: { type: "number" },
      avgStressLevel: { type: "number" },
      stressValuesArray: { type: "array", description: "Timestamped stress levels 0-100" },
    },
  },

  get_body_battery: {
    type: "array",
    items: {
      type: "object",
      properties: {
        date: { type: "string" },
        charged: { type: "number" },
        drained: { type: "number" },
        bodyBatteryValuesArray: { type: "array", description: "Timestamped readings" },
      },
    },
  },

  get_daily_steps: {
    type: "array",
    items: {
      type: "object",
      properties: {
        calendarDate: { type: "string" },
        totalSteps: { type: "number" },
        totalDistance: { type: "number", description: "meters" },
        stepGoal: { type: "number" },
      },
    },
  },

  get_intensity_minutes: {
    type: "object",
    properties: {
      calendarDate: { type: "string" },
      moderateMinutes: { type: "number" },
      vigorousMinutes: { type: "number" },
      weeklyModerate: { type: "number" },
      weeklyVigorous: { type: "number" },
      weeklyTotal: { type: "number" },
      weekGoal: { type: "number" },
      dayOfGoalMet: { type: "boolean" },
    },
  },

  // ─── Training ────────────────────────────────────────────────────────

  get_training_plans: {
    type: "object",
    properties: {
      trainingPlanList: { type: "array", description: "Array of plans with names, types, statuses, IDs" },
      searchFilter: { type: "object" },
    },
  },

  get_training_plan: {
    type: "object",
    description: "Training plan with scheduled workouts, phases, and progress",
  },

  get_workouts: {
    type: "array",
    items: {
      type: "object",
      properties: {
        workoutId: { type: "number" },
        workoutName: { type: "string" },
        sportType: { type: "object" },
        estimatedDurationInSecs: { type: "number" },
        estimatedDistanceInMeters: { type: "number" },
        shared: { type: "boolean" },
      },
    },
  },

  get_workout: {
    type: "object",
    properties: {
      workoutId: { type: "number" },
      workoutName: { type: "string" },
      sportType: { type: "object" },
      workoutSegments: { type: "array", description: "Segments with steps and targets" },
      estimatedDurationInSecs: { type: "number" },
      estimatedDistanceInMeters: { type: "number" },
    },
  },

  get_race_predictions: {
    type: "object",
    properties: {
      calendarDate: { type: "string" },
      fromCalendarDate: { type: "string" },
      toCalendarDate: { type: "string" },
      time5K: { type: "number", description: "seconds" },
      time10K: { type: "number", description: "seconds" },
      timeHalfMarathon: { type: "number", description: "seconds" },
      timeMarathon: { type: "number", description: "seconds" },
    },
  },

  get_endurance_score: {
    type: "object",
    properties: {
      startDate: { type: "string" },
      endDate: { type: "string" },
      avg: { type: "number" },
      max: { type: "number" },
      enduranceScoreDTO: { type: "object", description: "Detailed breakdown" },
      groupMap: { type: "object", description: "Scores grouped by aggregation period" },
    },
  },

  get_hill_score: {
    type: "object",
    description: "Latest hill score — single object, not a historical trend",
    properties: {
      calendarDate: { type: "string" },
      overallScore: { type: "number" },
      strengthScore: { type: "number" },
      enduranceScore: { type: "number" },
      vo2Max: { type: "number" },
      vo2MaxPreciseValue: { type: "number" },
    },
  },

  // ─── Write tools (output shapes) ────────────────────────────────────

  create_workout: {
    type: "object",
    description: "The created workout with assigned workoutId",
    properties: {
      workoutId: { type: "number" },
      workoutName: { type: "string" },
      sportType: { type: "object" },
      workoutSegments: { type: "array" },
    },
  },

  schedule_workout: {
    type: "object",
    description: "The scheduled workout entry",
  },

  delete_workout: {
    type: "object",
    properties: {
      deleted: { type: "boolean" },
      workoutId: { type: "string" },
    },
  },
};
