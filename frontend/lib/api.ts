import {
  Station,
  StationMapItem,
  LatestAQISummary,
  Observation,
  PaginatedResponse,
  ForecastResponse,
  MultiModelForecastComparisonResponse,
  ModelLabSummary,
  FairnessReport,
  HealthCategoryGuidance,
  DataSourceInfo,
  SystemHealthResponse
} from "@/types";

const DEFAULT_PROD_BACKEND = "https://mumbai-airsense-ai.onrender.com";

const getBaseUrl = () => {
  const envBackend = (
    process.env.NEXT_PUBLIC_API_BACKEND_URL ||
    (process.env.NODE_ENV === "production" ? DEFAULT_PROD_BACKEND : "")
  )?.replace(/\/+$/, "");

  if (typeof window !== "undefined") {
    // Client-side: communicate directly with backend to avoid edge proxy hops and cold-start timeouts
    if (envBackend) {
      return `${envBackend}/api/v1`;
    }
    // Local fallback: relative path rewritten by Next.js
    return "/api/v1";
  }

  // Server-side (SSR / ISR)
  if (process.env.INTERNAL_API_URL) {
    return process.env.INTERNAL_API_URL.replace(/\/+$/, "");
  }
  if (envBackend) {
    return `${envBackend}/api/v1`;
  }
  return "http://127.0.0.1:8000/api/v1";
};

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${getBaseUrl()}${endpoint}`;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      ...options,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`API Error [${res.status}] ${endpoint}: ${errorText}`);
    }

    return res.json();
  } catch (err: any) {
    if (err.message && err.message.includes("Failed to fetch")) {
      throw new Error(
        "Unable to connect to air quality telemetry service. If the server was sleeping (Render spin-down), please wait ~30 seconds and click Retry."
      );
    }
    throw err;
  }
}

export const api = {
  // System Health
  getHealth: () => fetchJson<SystemHealthResponse>("/health"),

  // Stations
  getStations: (city?: string) => {
    const params = city ? `?city=${encodeURIComponent(city)}` : "";
    return fetchJson<Station[]>(`/stations${params}`);
  },

  getStation: (stationId: string) => fetchJson<Station>(`/stations/${stationId}`),

  // Live Real-Time Telemetry
  getLiveSummary: (stationId?: string) => {
    const params = stationId ? `?station_id=${encodeURIComponent(stationId)}` : "";
    return fetchJson<LatestAQISummary>(`/live/summary${params}`);
  },
  getLiveMapStations: () => fetchJson<StationMapItem[]>("/live/map"),
  getLiveForecast: (stationId = "MH005", pollutant = "PM2.5", modelCode = "arima", horizonDays = 7) => {
    return fetchJson<ForecastResponse>(
      `/live/forecast?station_id=${stationId}&pollutant=${pollutant}&model_code=${modelCode}&horizon_days=${horizonDays}`
    );
  },
  getLiveCompareForecasts: (stationId = "MH005", pollutant = "PM2.5", horizonDays = 7) => {
    return fetchJson<MultiModelForecastComparisonResponse>(
      `/live/compare?station_id=${stationId}&pollutant=${pollutant}&horizon_days=${horizonDays}`
    );
  },

  // Observations & AQI
  getLatestAQI: (stationId?: string) => {
    const params = stationId ? `?station_id=${encodeURIComponent(stationId)}` : "";
    return fetchJson<LatestAQISummary>(`/observations/latest${params}`);
  },

  getHistory: (params: {
    station_id?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }) => {
    const q = new URLSearchParams();
    if (params.station_id) q.set("station_id", params.station_id);
    if (params.start_date) q.set("start_date", params.start_date);
    if (params.end_date) q.set("end_date", params.end_date);
    if (params.page) q.set("page", String(params.page));
    if (params.page_size) q.set("page_size", String(params.page_size));
    return fetchJson<PaginatedResponse<Observation>>(`/observations/history?${q.toString()}`);
  },

  getMapStations: (referenceDate?: string) => {
    const params = referenceDate ? `?reference_date=${encodeURIComponent(referenceDate)}` : "";
    return fetchJson<StationMapItem[]>(`/observations/map${params}`);
  },

  // 7-Day Forecasting
  getForecast: (body: {
    station_id: string;
    pollutant: string;
    model_code: string;
    horizon_days?: number;
  }) => {
    return fetchJson<ForecastResponse>("/forecast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        station_id: body.station_id,
        pollutant: body.pollutant,
        model_code: body.model_code,
        horizon_days: body.horizon_days ?? 7,
      }),
    });
  },

  compareForecasts: (stationId = "MH005", pollutant = "PM2.5", horizonDays = 7) => {
    return fetchJson<MultiModelForecastComparisonResponse>(
      `/forecast/compare?station_id=${stationId}&pollutant=${pollutant}&horizon_days=${horizonDays}`
    );
  },

  // Model Lab
  getModelLab: (stationId = "MH005", pollutant = "PM2.5") => {
    return fetchJson<ModelLabSummary>(`/models/lab?station_id=${stationId}&pollutant=${pollutant}`);
  },

  // Fairness & Health Guidance
  getFairness: () => fetchJson<FairnessReport>("/analysis/fairness"),
  getHealthGuidance: () => fetchJson<HealthCategoryGuidance[]>("/analysis/health"),
  getGeminiBrief: (stationId = "MH005") =>
    fetchJson<{
      status: string;
      model: string;
      station: string;
      aqi: number;
      category: string;
      brief: string;
      generated_at: string;
    }>(`/analysis/gemini-brief?station_id=${stationId}`),

  // Data Sources & Import
  getDataSources: () => fetchJson<DataSourceInfo[]>("/data/sources"),

  uploadCsv: async (file: File, apiKey: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", apiKey);

    const url = `${getBaseUrl()}/data/import`;
    const res = await fetch(url, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Upload Failed [${res.status}]: ${err}`);
    }

    return res.json();
  },
};
