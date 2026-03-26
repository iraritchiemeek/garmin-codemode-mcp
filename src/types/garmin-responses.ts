/**
 * Response types for Garmin Connect API endpoints.
 * Derived from live API calls — update when Garmin changes their API.
 */

// ─── Activities ──────────────────────────────────────────────────────────────

/** Returned by list_activities and get_activities_by_date (same endpoint). */
export interface ActivitySummary {
  activityId: number;
  activityName: string;
  activityType: { typeId: number; typeKey: string };
  activityUUID: string;
  startTimeLocal: string;
  startTimeGMT: string;
  duration: number;
  elapsedDuration: number;
  movingDuration: number;
  distance: number;
  averageSpeed: number;
  maxSpeed: number;
  averageHR: number;
  maxHR: number;
  calories: number;
  bmrCalories: number;
  steps: number;
  elevationGain: number;
  elevationLoss: number;
  avgElevation: number;
  maxElevation: number;
  minElevation: number;
  startLatitude: number;
  startLongitude: number;
  endLatitude: number;
  endLongitude: number;
  locationName: string;
  lapCount: number;
  eventType: unknown;
  privacy: unknown;
  deviceId: number;
  timeZoneId: number;
  beginTimestamp: number;
  sportTypeId: number;
  favorite: boolean;
  hasSplits: boolean;
  hasPolyline: boolean;
  hasImages: boolean;
  hasVideo: boolean;
  ownerId: number;
  ownerDisplayName: string;
  ownerFullName: string;
  manualActivity: boolean;
  autoCalcCalories: boolean;
  elevationCorrected: boolean;
  atpActivity: boolean;
  parent: boolean;
  splitSummaries: unknown[];
}

/** Returned by get_activity. */
export interface ActivityDetail {
  activityId: number;
  activityName: string;
  activityUUID: string;
  locationName: string;
  userProfileId: number;
  isMultiSportParent: boolean;
  activityTypeDTO: Record<string, unknown>;
  eventTypeDTO: Record<string, unknown>;
  summaryDTO: Record<string, unknown>;
  metadataDTO: Record<string, unknown>;
  timeZoneUnitDTO: Record<string, unknown>;
  accessControlRuleDTO: Record<string, unknown>;
}

/** Returned by get_activity_details. */
export interface ActivityMetrics {
  activityId: number;
  measurementCount: number;
  metricsCount: number;
  totalMetricsCount: number;
  detailsAvailable: boolean;
  pendingData: boolean;
  metricDescriptors: unknown[];
  activityDetailMetrics: unknown[];
  heartRateDTOs: unknown[] | null;
  geoPolylineDTO: Record<string, unknown> | null;
}

/** Returned by get_activity_splits. */
export interface ActivitySplits {
  activityId: number;
  lapDTOs: unknown[];
  eventDTOs: unknown[];
}

/** Element in array returned by get_activity_hr_zones. */
export interface HrZone {
  zoneNumber: number;
  secsInZone: number;
  zoneLowBoundary: number;
}

/** Returned by get_activity_weather. */
export interface ActivityWeather {
  temp: number;
  apparentTemp: number;
  dewPoint: number;
  relativeHumidity: number;
  windSpeed: number;
  windGust: number;
  windDirection: number;
  windDirectionCompassPoint: string;
  latitude: number;
  longitude: number;
  issueDate: string;
  weatherStationDTO: Record<string, unknown>;
  weatherTypeDTO: Record<string, unknown>;
}

/** Element in array returned by get_activity_gear and list_gear (same shape). */
export interface GearItem {
  gearPk: number;
  uuid: string;
  userProfilePk: number;
  gearMakeName: string;
  gearModelName: string;
  gearTypeName: string;
  gearStatusName: string;
  displayName: string | null;
  customMakeModel: string;
  dateBegin: string;
  dateEnd: string | null;
  maximumMeters: number;
  notified: boolean;
  createDate: string;
  updateDate: string;
  imageNameLarge: string | null;
  imageNameMedium: string | null;
  imageNameSmall: string | null;
}

/** Returned by get_gear_stats. */
export interface GearStats {
  gearPk: number;
  uuid: string;
  totalDistance: number;
  totalActivities: number;
  isProcessing: boolean;
  processing: boolean;
  createDate: number;
  updateDate: number;
}

/** Element in array returned by get_activity_types. */
export interface ActivityTypeEntry {
  typeId: number;
  typeKey: string;
  parentTypeId: number;
  isHidden: boolean;
  restricted: boolean;
  trimmable: boolean;
}

// ─── Health ──────────────────────────────────────────────────────────────────

/** Returned by get_sleep_data. */
export interface SleepData {
  dailySleepDTO: Record<string, unknown>;
  sleepLevels: unknown[];
  sleepMovement: unknown[];
  sleepHeartRate: unknown[];
  sleepStress: unknown[];
  sleepBodyBattery: unknown[];
  remSleepData: boolean;
  restingHeartRate: number;
  restlessMomentsCount: number;
  avgOvernightHrv: number;
  hrvStatus: string;
  hrvData: unknown;
  breathingDisruptionData: Record<string, unknown>;
  skinTempDataExists: boolean;
  skinTempCalibrationDays: number;
  avgSkinTempDeviationC: number;
  avgSkinTempDeviationF: number;
  bodyBatteryChange: number;
  respirationVersion: number;
  wellnessEpochRespirationAveragesList: unknown[];
  wellnessEpochRespirationDataDTOList: unknown[];
  wellnessEpochSPO2DataDTOList: unknown[];
  wellnessSpO2SleepSummaryDTO: Record<string, unknown> | null;
}

/** Returned by get_heart_rates. */
export interface HeartRateData {
  userProfilePK: number;
  calendarDate: string;
  startTimestampGMT: string;
  endTimestampGMT: string;
  startTimestampLocal: string;
  endTimestampLocal: string;
  maxHeartRate: number;
  minHeartRate: number;
  restingHeartRate: number;
  lastSevenDaysAvgRestingHeartRate: number;
  heartRateValueDescriptors: unknown[];
  heartRateValues: unknown[] | null;
}

/** Returned by get_hrv_data. */
export interface HrvData {
  userProfilePk: number;
  startTimestampGMT: string;
  endTimestampGMT: string;
  startTimestampLocal: string;
  endTimestampLocal: string;
  sleepStartTimestampGMT: string;
  sleepEndTimestampGMT: string;
  sleepStartTimestampLocal: string;
  sleepEndTimestampLocal: string;
  hrvSummary: Record<string, unknown>;
  hrvReadings: unknown[];
}

/** Element in array returned by get_training_readiness. */
export interface TrainingReadinessEntry {
  userProfilePK: number;
  calendarDate: string;
  timestamp: number;
  timestampLocal: string;
  score: number;
  level: string;
  feedbackShort: string;
  feedbackLong: string;
  deviceId: number;
  primaryActivityTracker: boolean;
  sleepScore: number;
  sleepScoreFactorPercent: number;
  sleepScoreFactorFeedback: string;
  recoveryTime: number;
  recoveryTimeFactorPercent: number;
  recoveryTimeFactorFeedback: string;
  recoveryTimeChangePhrase: string;
  hrvWeeklyAverage: number;
  hrvFactorPercent: number;
  hrvFactorFeedback: string;
  acuteLoad: number;
  acwrFactorPercent: number;
  acwrFactorFeedback: string;
  sleepHistoryFactorPercent: number;
  sleepHistoryFactorFeedback: string;
  stressHistoryFactorPercent: number;
  stressHistoryFactorFeedback: string;
  validSleep: boolean;
  inputContext: string;
}

/** Returned by get_training_status. */
export interface TrainingStatus {
  userId: number;
  mostRecentVO2Max: Record<string, unknown>;
  mostRecentTrainingStatus: Record<string, unknown>;
  mostRecentTrainingLoadBalance: Record<string, unknown>;
  heatAltitudeAcclimationDTO: Record<string, unknown>;
}

// ─── Trends ──────────────────────────────────────────────────────────────────

/** Element in array returned by get_max_metrics. */
export interface MaxMetricsEntry {
  userId: number;
  generic: {
    calendarDate: string;
    vo2MaxPreciseValue: number;
    vo2MaxValue: number;
    fitnessAge: number | null;
    fitnessAgeDescription: string | null;
    maxMetCategory: number;
  } | null;
  cycling: Record<string, unknown> | null;
  heatAltitudeAcclimation: Record<string, unknown> | null;
}

/** Returned by get_stress_data. */
export interface StressData {
  userProfilePK: number;
  calendarDate: string;
  startTimestampGMT: string;
  endTimestampGMT: string;
  startTimestampLocal: string;
  endTimestampLocal: string;
  maxStressLevel: number;
  avgStressLevel: number;
  stressChartValueOffset: number;
  stressChartYAxisOrigin: number;
  stressValueDescriptorsDTOList: unknown[];
  stressValuesArray: unknown[];
  bodyBatteryValueDescriptorsDTOList: unknown[];
  bodyBatteryValuesArray: unknown[];
}

/** Element in array returned by get_body_battery. */
export interface BodyBatteryEntry {
  date: string;
  charged: number;
  drained: number;
  startTimestampGMT: string;
  endTimestampGMT: string;
  startTimestampLocal: string;
  endTimestampLocal: string;
  bodyBatteryValuesArray: unknown[];
  bodyBatteryValueDescriptorDTOList: unknown[];
  bodyBatteryActivityEvent: unknown[];
  bodyBatteryDynamicFeedbackEvent: unknown[];
  endOfDayBodyBatteryDynamicFeedbackEvent: Record<string, unknown> | null;
}

/** Element in array returned by get_daily_steps. */
export interface DailyStepsEntry {
  calendarDate: string;
  totalSteps: number;
  totalDistance: number;
  stepGoal: number;
}

/** Returned by get_intensity_minutes. */
export interface IntensityMinutes {
  userProfilePK: number;
  calendarDate: string;
  startTimestampGMT: string;
  endTimestampGMT: string;
  startTimestampLocal: string;
  endTimestampLocal: string;
  moderateMinutes: number;
  vigorousMinutes: number;
  weeklyModerate: number;
  weeklyVigorous: number;
  weeklyTotal: number;
  weekGoal: number;
  startDayMinutes: number;
  endDayMinutes: number;
  dayOfGoalMet: boolean;
  imValueDescriptorsDTOList: unknown[];
  imValuesArray: unknown[];
}

// ─── Training ────────────────────────────────────────────────────────────────

/** Returned by get_training_plans. */
export interface TrainingPlansResponse {
  trainingPlanList: unknown[];
  searchFilter: Record<string, unknown>;
}

/** Element in array returned by get_workouts. */
export interface WorkoutSummary {
  workoutId: number;
  workoutName: string;
  sportType: Record<string, unknown>;
  ownerId: number;
  description: string | null;
  createdDate: string;
  updateDate: string;
  estimatedDurationInSecs: number;
  estimatedDistanceInMeters: number;
  estimateType: string | null;
  estimatedDistanceUnit: Record<string, unknown> | null;
  poolLength: number;
  poolLengthUnit: Record<string, unknown> | null;
  shared: boolean;
  trainingPlanId: string | null;
  atpPlanId: string | null;
  author: Record<string, unknown>;
  consumer: string | null;
  workoutProvider: string | null;
  workoutSourceId: string | null;
  workoutNameI18nKey: string | null;
  descriptionI18nKey: string | null;
  workoutThumbnailUrl: string | null;
}

/** Returned by get_workout. */
export interface WorkoutDetail {
  workoutId: number;
  workoutName: string;
  sportType: Record<string, unknown>;
  subSportType: Record<string, unknown> | null;
  workoutSegments: unknown[];
  ownerId: number;
  description: string | null;
  createdDate: string;
  updatedDate: string;
  estimatedDurationInSecs: number;
  estimatedDistanceInMeters: number;
  estimateType: string | null;
  estimatedDistanceUnit: Record<string, unknown> | null;
  poolLength: number;
  poolLengthUnit: Record<string, unknown> | null;
  shared: boolean;
  sharedWithUsers: unknown[];
  trainingPlanId: string | null;
  atpPlanId: string | null;
  author: Record<string, unknown>;
  consumer: string | null;
  workoutProvider: string | null;
  workoutSourceId: string | null;
  locale: string | null;
  avgTrainingSpeed: number;
  isSessionTransitionEnabled: boolean;
  uploadTimestamp: number | null;
  workoutNameI18nKey: string | null;
  workoutThumbnailUrl: string | null;
  consumerName: string | null;
  consumerImageURL: string | null;
  consumerWebsiteURL: string | null;
}

/** Returned by get_race_predictions. */
export interface RacePredictions {
  userId: number;
  calendarDate: string;
  fromCalendarDate: string;
  toCalendarDate: string;
  time5K: number;
  time10K: number;
  timeHalfMarathon: number;
  timeMarathon: number;
}

/** Returned by get_endurance_score. */
export interface EnduranceScore {
  userProfilePK: number;
  startDate: string;
  endDate: string;
  avg: number;
  max: number;
  enduranceScoreDTO: Record<string, unknown>;
  groupMap: Record<string, unknown>;
}

/** Returned by get_hill_score. */
export interface HillScore {
  userProfilePK: number;
  deviceId: number;
  calendarDate: string;
  overallScore: number;
  strengthScore: number;
  enduranceScore: number;
  hillScoreClassificationId: number;
  hillScoreFeedbackPhraseId: number;
  vo2Max: number;
  vo2MaxPreciseValue: number;
  primaryTrainingDevice: boolean;
}
