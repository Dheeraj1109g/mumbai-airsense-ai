export interface Station {
  station_id: string;
  station_name: string;
  city: string;
  state: string;
  latitude: float;
  longitude: float;
  operator: string;
  status: string;
  area_type: string;
  created_at?: string;
}

export type float = number;

export interface StationMapItem extends Station {
  latest_observation_date: string | null;
  latest_aqi: number | null;
  latest_bucket: string | null;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  so2: number | null;
  co: number | null;
  o3: number | null;
  prominent_pollutant: string | null;
  data_freshness_status: "available" | "stale" | "missing";
  has_active_forecast: boolean;
}

export interface LatestAQISummary {
  mumbai_aqi: number | null;
  mumbai_bucket: string | null;
  observation_date: string | null;
  data_provenance: string;
  active_stations_reporting: number;
  total_stations: number;
  most_polluted_station: {
    station_id: string;
    station_name: string;
    aqi: number;
    category: string;
    prominent_pollutant: string;
    pm25: number | null;
    pm10: number | null;
  } | null;
  least_polluted_station: {
    station_id: string;
    station_name: string;
    aqi: number;
    category: string;
    prominent_pollutant: string;
    pm25: number | null;
    pm10: number | null;
  } | null;
  prominent_pollutant_citywide: string | null;
  pollutant_distribution: Record<string, {
    mean: number;
    min: number;
    max: number;
    count: number;
  }>;
  data_freshness_warning: string | null;
}

export interface Observation {
  id: number;
  station_id: string;
  observation_date: string;
  observation_time?: string | null;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  so2: number | null;
  co: number | null;
  o3: number | null;
  nh3: number | null;
  official_aqi: number | null;
  official_bucket: string | null;
  calculated_aqi: number | null;
  calculated_bucket: string | null;
  prominent_pollutant: string | null;
  data_provenance: string;
  created_at?: string;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  page_size: number;
  items: T[];
}

export interface ForecastValueItem {
  forecast_date: string;
  predicted_value: number;
  lower_bound: number | null;
  upper_bound: number | null;
  calculated_predicted_aqi: number | null;
  predicted_aqi_bucket: string | null;
}

export interface ForecastResponse {
  station_id: string;
  station_name: string;
  pollutant: string;
  unit: string;
  model_code: string;
  model_version: string;
  generated_at: string;
  horizon_days: number;
  interval_type: string;
  confidence_level: number;
  forecast_disclaimer: string;
  historical_context: Array<{ date: string; value: number }>;
  forecast_points: ForecastValueItem[];
}

export interface ModelComparisonItem {
  model_code: string;
  model_name: string;
  forecast_points: ForecastValueItem[];
  test_mae: number | null;
  test_rmse: number | null;
  test_mape: number | null;
  best_model: boolean;
}

export interface MultiModelForecastComparisonResponse {
  station_id: string;
  pollutant: string;
  horizon_days: number;
  generated_at: string;
  models: ModelComparisonItem[];
  recommendation_rationale: string;
}

export interface ModelEvaluationComparison {
  model_code: string;
  display_name: string;
  model_type: string;
  version: string;
  sample_count: number;
  test_mae: number;
  test_rmse: number;
  test_mape: number | null;
  coverage_95: number | null;
  residual_summary?: {
    mean: number;
    std: number;
    skewness: number;
    underprediction_rate: number;
    overprediction_rate: number;
  };
  hyperparameters?: Record<string, any>;
  is_recommended: boolean;
}

export interface ModelLabSummary {
  station_id: string;
  pollutant: string;
  evaluation_period: {
    start: string;
    end: string;
    held_out_days: number;
  };
  models: ModelEvaluationComparison[];
  backtest_series: Array<{
    date: string;
    actual: number;
  }>;
  mape_zero_warning: string;
}

export interface HealthCategoryGuidance {
  category: string;
  aqi_range: string;
  color_code: string;
  severity: string;
  general_population_advice: string;
  sensitive_groups_advice: string;
  outdoor_activity_recommendation: string;
  official_source: string;
  source_url: string;
  verified_date: string;
}

export interface FairnessStationCoverage {
  station_id: string;
  station_name: string;
  area_type: string;
  total_days_recorded: number;
  pm25_valid_count: number;
  pm25_missing_pct: number;
  pm10_valid_count: number;
  pm10_missing_pct: number;
  valid_aqi_days: number;
  reliability_tier: "High" | "Medium" | "Low";
}

export interface FairnessReport {
  stations_coverage: FairnessStationCoverage[];
  seasonal_patterns: Array<{
    season: string;
    characteristics: string;
    typical_aqi_range: string;
  }>;
  academic_report: {
    title: string;
    key_findings: string[];
    ethical_and_methodological_disclaimers: string[];
  };
}

export interface DataSourceInfo {
  source_id: string;
  title: string;
  organization: string;
  type: string;
  license: string;
  coverage_period: string;
  parameters: string[];
  access_status: string;
  url: string;
  notes: string;
}

export interface SystemHealthResponse {
  status: string;
  project_name: string;
  version: string;
  database_status: string;
  database_engine: string;
  active_stations_count: number;
  total_observations_count: number;
  trained_models_count: number;
  latest_observation_date: string | null;
  data_provenance_mode: string;
}
