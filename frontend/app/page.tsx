"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  MapPin,
  RefreshCw,
  Download,
  FileText,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  ShieldAlert,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Activity,
  Wind,
  Layers,
  Radio
} from "lucide-react";

import { api } from "@/lib/api";
import { LatestAQISummary, Station, StationMapItem } from "@/types";
import { getAQIColor, getAQIBadgeClass, formatDate, formatNum } from "@/lib/utils";
import { generateOverviewPDF } from "@/lib/pdf-export";

// Dynamically import Leaflet with SSR disabled
const DynamicLeafletMap = dynamic(
  () =>
    import("react-leaflet").then((mod) => {
      const { MapContainer, TileLayer, CircleMarker, Tooltip } = mod;
      return function MiniMapInner({
        stations,
        selectedId,
        onSelect,
      }: {
        stations: StationMapItem[];
        selectedId: string;
        onSelect: (id: string) => void;
      }) {
        return (
          <MapContainer
            center={[19.076, 72.8777]}
            zoom={11}
            scrollWheelZoom={false}
            style={{ height: "100%", width: "100%", minHeight: "380px" }}
            className="z-0 rounded-lg dark-map"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={18}
            />
            {stations.map((stn) => {
              const color = getAQIColor(stn.latest_aqi);
              const isSelected = selectedId === stn.station_id;
              return (
                <CircleMarker
                  key={stn.station_id}
                  center={[stn.latitude, stn.longitude]}
                  radius={isSelected ? 12 : 7}
                  pathOptions={{
                    fillColor: color,
                    fillOpacity: 0.95,
                    color: isSelected ? "#ffffff" : "#18181b",
                    weight: isSelected ? 2.5 : 1,
                  }}
                  eventHandlers={{
                    click: () => onSelect(stn.station_id),
                  }}
                >
                  <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                    <div className="font-mono text-xs space-y-0.5 p-0.5">
                      <div className="font-bold text-white">{stn.station_name}</div>
                      <div className="text-neutral-400">AQI: <strong style={{ color }}>{stn.latest_aqi ? Math.round(stn.latest_aqi) : "—"}</strong> ({stn.latest_bucket || "N/A"})</div>
                    </div>
                  </Tooltip>
                </CircleMarker>
              );
            })}
          </MapContainer>
        );
      };
    }),
  {
    ssr: false,
    loading: () => (
      <div className="h-[380px] flex items-center justify-center text-xs font-mono text-neutral-500 rounded-lg bg-neutral-950 border border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border border-neutral-400 border-t-transparent" />
          <span>Synchronizing live geospatial coordinates...</span>
        </div>
      </div>
    ),
  }
);

const HEALTH_ADVICE: Record<string, { summary: string; action: string; icon: any; color: string }> = {
  Good: {
    summary: "Air quality poses minimal or zero risk for the general population.",
    action: "Optimal conditions for all outdoor sports and exercise.",
    icon: ShieldCheck,
    color: "#22c55e",
  },
  Satisfactory: {
    summary: "Minor respiratory discomfort possible for highly sensitive individuals.",
    action: "Safe for normal outdoor exercise.",
    icon: CheckCircle,
    color: "#84cc16",
  },
  Moderate: {
    summary: "Breathing discomfort possible to individuals with lung or heart conditions.",
    action: "Sensitive individuals should limit prolonged morning outdoor exertion.",
    icon: HelpCircle,
    color: "#eab308",
  },
  Poor: {
    summary: "Breathing discomfort to most individuals on prolonged ambient exposure.",
    action: "Wear an N95 mask outdoors during heavy traffic commutes.",
    icon: ShieldAlert,
    color: "#f97316",
  },
  "Very Poor": {
    summary: "May cause respiratory illness on prolonged exposure. Significant hazard to children.",
    action: "Avoid outdoor physical workouts; maintain indoor air filtration.",
    icon: AlertTriangle,
    color: "#ef4444",
  },
  Severe: {
    summary: "Affects healthy individuals and severely impacts citizens with preexisting conditions.",
    action: "Stay strictly indoors with HEPA air purifiers active.",
    icon: AlertTriangle,
    color: "#991b1b",
  },
  Unknown: {
    summary: "Continuous observations undergoing statutory verification against CPCB standards.",
    action: "Consult verified local ground stations.",
    icon: HelpCircle,
    color: "#71717a",
  },
};

export default function OverviewPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>("MUMBAI_CITY");
  const [summary, setSummary] = useState<LatestAQISummary | null>(null);
  const [leaderboardStations, setLeaderboardStations] = useState<StationMapItem[]>([]);
  const [geminiBrief, setGeminiBrief] = useState<string | null>(null);
  const [briefOpen, setBriefOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (stationId = selectedStation) => {
    setLoading(true);
    setError(null);
    try {
      const [stns, aqiSummary, mapStns] = await Promise.all([
        api.getStations(),
        api.getLiveSummary(stationId),
        api.getLiveMapStations().catch(() => [])
      ]);

      setStations(stns);
      setSummary(aqiSummary);
      setLeaderboardStations(mapStns);

      api.getGeminiBrief(stationId)
        .then((b) => setGeminiBrief(b.brief))
        .catch(() => setGeminiBrief(null));
    } catch (err: any) {
      console.error("Dashboard error:", err);
      setError(err.message || "Failed to load telemetry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedStation);
  }, [selectedStation]);

  const isCityWide = selectedStation === "MUMBAI_CITY";

  const cityWideItem = leaderboardStations.length
    ? {
        station_id: "MUMBAI_CITY",
        station_name: "Mumbai Composite Average",
        pm25: Math.round((leaderboardStations.reduce((acc, s) => acc + (s.pm25 || 0), 0) / leaderboardStations.length) * 10) / 10,
        pm10: Math.round((leaderboardStations.reduce((acc, s) => acc + (s.pm10 || 0), 0) / leaderboardStations.length) * 10) / 10,
        no2: Math.round((leaderboardStations.reduce((acc, s) => acc + (s.no2 || 0), 0) / leaderboardStations.length) * 10) / 10,
        so2: Math.round((leaderboardStations.reduce((acc, s) => acc + (s.so2 || 0), 0) / leaderboardStations.length) * 10) / 10,
        co: Math.round((leaderboardStations.reduce((acc, s) => acc + (s.co || 0), 0) / leaderboardStations.length) * 100) / 100,
        o3: Math.round((leaderboardStations.reduce((acc, s) => acc + (s.o3 || 0), 0) / leaderboardStations.length) * 10) / 10,
        latest_aqi: summary?.mumbai_aqi ?? Math.round(leaderboardStations.reduce((acc, s) => acc + (s.latest_aqi || 0), 0) / leaderboardStations.length),
        latest_bucket: summary?.mumbai_bucket ?? "Moderate",
        prominent_pollutant: summary?.prominent_pollutant_citywide ?? "PM2.5",
      }
    : null;

  const activeStationItem = isCityWide
    ? cityWideItem
    : leaderboardStations.find((s) => s.station_id === selectedStation) || leaderboardStations[0];

  const currentAQI = activeStationItem?.latest_aqi ?? summary?.mumbai_aqi ?? null;
  const currentCategory = activeStationItem?.latest_bucket ?? summary?.mumbai_bucket ?? "Unknown";
  const aqiColor = getAQIColor(currentAQI);
  const advice = HEALTH_ADVICE[currentCategory] || HEALTH_ADVICE["Unknown"];
  const AdviceIcon = advice.icon;

  const needlePct = currentAQI !== null ? Math.min(100, Math.max(0, (currentAQI / 500) * 100)) : 0;

  const downloadCSV = () => {
    if (!leaderboardStations.length) return;
    const rows = [
      "Station_Id,Station_Name,City,Area_Type,CPCB_AQI,Category,PM2.5,PM10,NO2,SO2,CO,O3,Observation_Time",
    ];
    leaderboardStations.forEach((s) => {
      rows.push(
        `${s.station_id},"${s.station_name}","${s.city}","${s.area_type || ""}",${s.latest_aqi || ""},"${s.latest_bucket || ""}",${s.pm25 || ""},${s.pm10 || ""},${s.no2 || ""},${s.so2 || ""},${s.co || ""},${s.o3 || ""},${s.latest_observation_date || ""}`
      );
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Mumbai_AirSense_Stations_Telemetry_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    generateOverviewPDF({
      cityAqi: currentAQI,
      cityBucket: currentCategory,
      prominentPollutant: summary?.prominent_pollutant_citywide || "PM2.5",
      reportingStationsCount: leaderboardStations.length,
      stations: leaderboardStations,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header Strip - Clean & Refined */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono">
              Mumbai Air Quality
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900/80 px-2.5 py-0.5 text-[10px] font-mono text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              14 CAAQMS NODES LIVE
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-mono">
            Continuous ambient air quality monitoring • Statutory Central Pollution Control Board (CPCB) NAQI
          </p>
        </div>

        {/* Minimal Station Select & Sync */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            id="station-select"
            value={selectedStation}
            onChange={(e) => setSelectedStation(e.target.value)}
            aria-label="Select monitoring station"
            className="rounded-md border border-neutral-800 bg-neutral-900/90 px-3 py-1.5 text-xs text-neutral-200 focus:border-neutral-500 focus:outline-none font-mono cursor-pointer transition-colors"
          >
            <option value="MUMBAI_CITY">Mumbai Composite Average</option>
            {stations
              .filter((s) => s.station_id !== "MUMBAI_CITY")
              .map((stn) => (
                <option key={stn.station_id} value={stn.station_id}>
                  {stn.station_name}
                </option>
              ))}
          </select>

          <button
            onClick={() => loadData()}
            disabled={loading}
            aria-label="Refresh telemetry data"
            className="flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-900/90 px-2.5 py-1.5 text-xs font-mono text-neutral-300 hover:text-white hover:bg-neutral-800 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin text-neutral-400" : ""}`} />
            <span>Sync</span>
          </button>

          <button
            onClick={downloadCSV}
            className="flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-900/90 px-2.5 py-1.5 text-xs font-mono text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Download all station telemetry as CSV spreadsheet"
          >
            <Download className="h-3 w-3 text-neutral-400" />
            <span>CSV</span>
          </button>

          <button
            onClick={downloadPDF}
            className="flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-900/90 px-2.5 py-1.5 text-xs font-mono text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Download official CPCB daily bulletin as PDF"
          >
            <FileText className="h-3 w-3 text-rose-400" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-900/50 bg-red-950/20 p-3 text-xs text-red-200 font-mono flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => loadData()}
            className="rounded bg-neutral-900 border border-neutral-800 px-2 py-0.5 text-xs text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main 2-Column Hero: Left AQI Card (5 cols) + Right Live Map (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Refined Double-Bezel AQI Card */}
        <div className="lg:col-span-5 rounded-xl p-1 bg-gradient-to-b from-neutral-800/50 via-neutral-900/20 to-transparent border border-neutral-800">
          <div className="rounded-[calc(0.75rem-0.125rem)] bg-[#09090b] p-5 sm:p-6 flex flex-col justify-between space-y-5 h-full">
            <div>
              {/* Card Header */}
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block font-medium">
                    National Air Quality Index
                  </span>
                  <h2 className="text-sm font-bold text-white font-mono mt-0.5 line-clamp-1">
                    {selectedStation === "MUMBAI_CITY"
                      ? "Mumbai Metropolitan Region"
                      : stations.find((s) => s.station_id === selectedStation)?.station_name || selectedStation}
                  </h2>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${getAQIBadgeClass(currentCategory)}`}>
                  {currentCategory}
                </span>
              </div>

              {/* AQI Numeral & Driver */}
              <div className="my-4 flex items-baseline gap-3.5">
                <span
                  className="text-6xl sm:text-7xl font-bold tracking-tight font-mono tabular-nums"
                  style={{ color: aqiColor }}
                >
                  {currentAQI !== null ? Math.round(currentAQI) : "—"}
                </span>
                <div className="space-y-0.5">
                  <span className="text-xs text-neutral-400 font-mono block">CPCB Index</span>
                  <span className="text-[11px] text-neutral-500 font-mono">
                    Driver: <strong className="text-neutral-200">{summary?.prominent_pollutant_citywide || "PM2.5"}</strong>
                  </span>
                </div>
              </div>

              {/* Segmented CPCB Scale Bar with Active Indicator */}
              <div className="space-y-1.5 my-3">
                <div className="relative h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden flex border border-neutral-800">
                  <div className="h-full bg-emerald-500" style={{ width: "10%" }} title="Good (0-50)" />
                  <div className="h-full bg-lime-500" style={{ width: "10%" }} title="Satisfactory (51-100)" />
                  <div className="h-full bg-yellow-500" style={{ width: "20%" }} title="Moderate (101-200)" />
                  <div className="h-full bg-orange-500" style={{ width: "20%" }} title="Poor (201-300)" />
                  <div className="h-full bg-red-500" style={{ width: "20%" }} title="Very Poor (301-400)" />
                  <div className="h-full bg-rose-950" style={{ width: "20%" }} title="Severe (401-500)" />
                </div>
                <div className="flex justify-between text-[9px] font-mono text-neutral-500">
                  <span>0 Good</span>
                  <span>100</span>
                  <span>200</span>
                  <span>300</span>
                  <span>400</span>
                  <span>500+</span>
                </div>
              </div>

              {/* Citizen Health Guidance Container */}
              <div className="rounded-md border border-neutral-800/80 bg-neutral-950/70 p-3.5 space-y-1.5 text-xs font-mono">
                <div className="flex items-center gap-1.5 text-neutral-300">
                  <AdviceIcon className="h-3.5 w-3.5" style={{ color: advice.color }} />
                  <span className="text-[10px] uppercase tracking-wider font-semibold">
                    Citizen Health Guidance
                  </span>
                </div>
                <p className="text-neutral-300 leading-relaxed font-sans text-xs">
                  {advice.summary}
                </p>
                <p className="text-neutral-400 text-[11px] pt-0.5">
                  → {advice.action}
                </p>
              </div>
            </div>

            {/* Bottom Meta */}
            <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-[11px] font-mono text-neutral-500">
              <span>Updated: {formatDate(summary?.observation_date)}</span>
              <Link href="/forecast" className="text-neutral-300 hover:text-white flex items-center gap-1 font-medium transition-colors">
                <span>7-Day Projections</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Right: Embedded Interactive Live Map (7 cols) - Refined HUD */}
        <div className="lg:col-span-7 rounded-xl p-1 bg-gradient-to-b from-neutral-800/50 via-neutral-900/20 to-transparent border border-neutral-800">
          <div className="rounded-[calc(0.75rem-0.125rem)] bg-[#09090b] p-3.5 flex flex-col justify-between space-y-2.5 h-full">
            {/* Map Header HUD */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Live Geospatial Telemetry
                </span>
                <span className="text-[10px] font-mono text-neutral-500">
                  ({leaderboardStations.length} reporting nodes)
                </span>
              </div>
              <Link
                href="/map"
                className="flex items-center gap-1 text-xs font-mono text-neutral-400 hover:text-white transition-colors"
              >
                <span>Full Map</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Embedded Map Canvas */}
            <div className="h-[360px] w-full rounded-md overflow-hidden relative border border-neutral-800/90 shadow-inner">
              <DynamicLeafletMap
                stations={leaderboardStations}
                selectedId={selectedStation}
                onSelect={(id) => setSelectedStation(id)}
              />

              {/* Floating Map Overlay HUD */}
              <div className="absolute bottom-2.5 right-2.5 z-10 rounded border border-neutral-800 bg-black/90 px-2 py-1 text-[9px] font-mono text-neutral-400 flex items-center gap-2.5 shadow-lg backdrop-blur-sm pointer-events-none">
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Good</span>
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-yellow-500" /> Moderate</span>
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-orange-500" /> Poor</span>
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Severe</span>
              </div>
            </div>

            <div className="flex items-center justify-between px-1 text-[10px] font-mono text-neutral-500">
              <span>Interactive: Click any station node on the map to switch telemetry</span>
              <span>OpenStreetMap • CAAQMS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Criteria Pollutant Concentration Strip */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono font-semibold text-neutral-400 uppercase tracking-wider">
            Criteria Pollutant Concentrations
          </span>
          <span className="text-[10px] font-mono text-neutral-500">CPCB 24-Hour Limits</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {[
            { label: "PM₂.₅", name: "Fine Particles", val: activeStationItem?.pm25, unit: "µg/m³", limit: 60 },
            { label: "PM₁₀", name: "Coarse Dust", val: activeStationItem?.pm10, unit: "µg/m³", limit: 100 },
            { label: "NO₂", name: "Nitrogen Dioxide", val: activeStationItem?.no2, unit: "µg/m³", limit: 80 },
            { label: "SO₂", name: "Sulphur Dioxide", val: activeStationItem?.so2, unit: "µg/m³", limit: 80 },
            { label: "CO", name: "Carbon Monoxide", val: activeStationItem?.co, unit: "mg/m³", limit: 2.0 },
            { label: "O₃", name: "Ground Ozone", val: activeStationItem?.o3, unit: "µg/m³", limit: 100 },
          ].map((item) => {
            const isExceeded = item.val && item.val > item.limit;
            const pct = item.val ? Math.min(100, (item.val / (item.limit * 2)) * 100) : 0;
            return (
              <div
                key={item.label}
                className="rounded-lg border border-neutral-800 bg-[#09090b] p-3 space-y-1.5 hover:border-neutral-700 transition-colors"
              >
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="font-bold text-white">{item.label}</span>
                  <span className={`text-[10px] font-mono px-1 py-0.2 rounded ${isExceeded ? "bg-rose-950/70 text-rose-300 border border-rose-900/60" : "text-neutral-500"}`}>
                    Max {item.limit}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-xl font-bold text-white tabular-nums tracking-tight">
                    {formatNum(item.val)}
                  </span>
                  <span className="text-[10px] text-neutral-500">{item.unit}</span>
                </div>
                <div className="h-1 w-full bg-neutral-900 rounded-full overflow-hidden border border-neutral-800/80">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${isExceeded ? "bg-rose-500" : "bg-neutral-300"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sleek Minimalist Gemini AI Diagnostic Drawer */}
      {geminiBrief && (
        <div className="rounded-lg border border-neutral-800 bg-[#09090b] p-3.5 text-xs font-mono">
          <button
            onClick={() => setBriefOpen(!briefOpen)}
            className="w-full flex items-center justify-between text-left text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                Gemini 1.5 Atmospheric Intelligence Diagnostic
              </span>
              <span className="rounded border border-neutral-800 bg-neutral-900 px-1.5 py-0.2 text-[9px] text-neutral-400">
                AI SYNTHESIS
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-neutral-500 text-[11px]">
              <span>{briefOpen ? "Minimize" : "Expand Brief"}</span>
              {briefOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </div>
          </button>

          {briefOpen && (
            <div className="mt-3 pt-3 border-t border-neutral-800 text-xs text-neutral-300 font-sans leading-relaxed whitespace-pre-line space-y-2">
              {geminiBrief.replace(/###/g, "").replace(/\*\*/g, "")}
            </div>
          )}
        </div>
      )}

      {/* Station Leaderboard Table - skills.sh Directory Format */}
      <div className="rounded-lg border border-neutral-800 bg-[#09090b] p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              MMR Station Leaderboard
            </h3>
            <p className="text-[11px] text-neutral-500 font-mono">
              All 14 official monitoring stations sorted by real-time air quality index
            </p>
          </div>
          <Link
            href="/map"
            className="flex items-center gap-1 text-xs font-mono text-neutral-400 hover:text-white transition-colors"
          >
            <span>Explore All on Map</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-500 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Station Name</th>
                <th className="py-2.5 px-3">Operator</th>
                <th className="py-2.5 px-3 text-right">AQI</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-right">PM₂.₅</th>
                <th className="py-2.5 px-3 text-right">PM₁₀</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {leaderboardStations
                .slice()
                .sort((a, b) => (b.latest_aqi || 0) - (a.latest_aqi || 0))
                .map((stn, idx) => {
                  const aqi = stn.latest_aqi;
                  const color = getAQIColor(aqi);
                  const isSelected = selectedStation === stn.station_id;

                  return (
                    <tr
                      key={stn.station_id}
                      onClick={() => setSelectedStation(stn.station_id)}
                      className={`hover:bg-neutral-900/40 transition-colors cursor-pointer ${
                        isSelected ? "bg-neutral-900/60" : ""
                      }`}
                    >
                      <td className="py-2.5 px-3 text-neutral-500 font-bold tabular-nums">
                        {String(idx + 1).padStart(2, "0")}
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <span className="font-semibold text-white text-xs">{stn.station_name}</span>
                        <span className="block text-[10px] text-neutral-500 font-mono">{stn.area_type}</span>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-400 text-[11px]">
                        <span className="rounded border border-neutral-800 bg-neutral-950 px-1.5 py-0.2 text-[9px] font-mono">
                          {stn.operator}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-sm tabular-nums" style={{ color }}>
                        {aqi ? Math.round(aqi) : "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getAQIBadgeClass(stn.latest_bucket)}`}>
                          {stn.latest_bucket || "Unknown"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-neutral-300">
                        {formatNum(stn.pm25)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-neutral-400">
                        {formatNum(stn.pm10)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStation(stn.station_id);
                          }}
                          className={`rounded px-2.5 py-0.5 text-[10px] font-mono transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-white text-black font-semibold"
                              : "border border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white hover:bg-neutral-800"
                          }`}
                        >
                          {isSelected ? "Active" : "Inspect"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
