"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { StationMapItem } from "@/types";
import { getAQIColor, getAQIBadgeClass, formatDate, formatNum } from "@/lib/utils";
import {
  Search,
  MapPin,
  Filter,
  ArrowRightLeft
} from "lucide-react";

// Dynamically import Leaflet components with SSR disabled
const DynamicMap = dynamic(
  () =>
    import("react-leaflet").then((mod) => {
      const { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } = mod;
      return function LeafletMapInner({
        stations,
        selectedStationId,
        onSelectStation,
      }: {
        stations: StationMapItem[];
        selectedStationId: string | null;
        onSelectStation: (stn: StationMapItem) => void;
      }) {
        return (
          <MapContainer
            center={[19.076, 72.8777]}
            zoom={11}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%", minHeight: "560px" }}
            className="z-0 rounded-lg dark-map"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={18}
            />
            {stations.map((stn) => {
              const color = getAQIColor(stn.latest_aqi);
              const isSelected = selectedStationId === stn.station_id;

              return (
                <CircleMarker
                  key={stn.station_id}
                  center={[stn.latitude, stn.longitude]}
                  radius={isSelected ? 13 : 8}
                  pathOptions={{
                    fillColor: color,
                    fillOpacity: 0.9,
                    color: isSelected ? "#ffffff" : "#000000",
                    weight: isSelected ? 3 : 1.5,
                  }}
                  eventHandlers={{
                    click: () => onSelectStation(stn),
                  }}
                >
                  <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                    <span className="font-bold">{stn.station_name}</span>: AQI{" "}
                    {stn.latest_aqi ? Math.round(stn.latest_aqi) : "—"}
                  </Tooltip>
                  <Popup>
                    <div className="p-1 space-y-2 text-xs font-mono">
                      <div>
                        <span className="rounded border border-neutral-800 bg-neutral-900 px-1 py-0.2 text-[9px] text-neutral-400">[{stn.station_id}]</span>
                        <h4 className="font-bold text-white text-sm mt-1">{stn.station_name}</h4>
                        <p className="text-neutral-400 text-[11px]">{stn.operator} • {stn.area_type}</p>
                      </div>

                      <div className="flex items-center justify-between border-y border-neutral-800 py-1.5 font-mono">
                        <span className="text-neutral-400">CPCB AQI:</span>
                        <span className="font-bold text-sm" style={{ color }}>
                          {stn.latest_aqi ? Math.round(stn.latest_aqi) : "N/A"}{" "}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${getAQIBadgeClass(stn.latest_bucket)}`}>
                            {stn.latest_bucket || "Unknown"}
                          </span>
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 text-[10px] text-neutral-300 font-mono">
                        <div>PM₂.₅: <span className="font-bold text-white">{formatNum(stn.pm25)}</span></div>
                        <div>PM₁₀: <span className="font-bold text-white">{formatNum(stn.pm10)}</span></div>
                        <div>NO₂: <span className="font-bold text-white">{formatNum(stn.no2)}</span></div>
                        <div>SO₂: <span className="font-bold text-white">{formatNum(stn.so2)}</span></div>
                        <div>CO: <span className="font-bold text-white">{formatNum(stn.co)}</span></div>
                        <div>O₃: <span className="font-bold text-white">{formatNum(stn.o3)}</span></div>
                      </div>

                      <div className="pt-1 text-[10px] text-neutral-500 border-t border-neutral-800 font-mono">
                        Observed: {formatDate(stn.latest_observation_date)}
                      </div>
                    </div>
                  </Popup>
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
      <div className="h-[560px] flex flex-col items-center justify-center gap-2 text-neutral-400 text-xs rounded-lg bg-neutral-950 border border-neutral-800">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        <span className="font-mono">Loading telemetry coordinates...</span>
      </div>
    ),
  }
);

interface MapViewProps {
  stations: StationMapItem[];
  isLiveMode?: boolean;
  onToggleMode?: (live: boolean) => void;
}

export default function MapView({ stations, isLiveMode = true, onToggleMode }: MapViewProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [selectedStation, setSelectedStation] = useState<StationMapItem | null>(stations[0] || null);
  const [compareStation, setCompareStation] = useState<StationMapItem | null>(null);

  useEffect(() => {
    if (stations.length > 0 && !selectedStation) {
      setSelectedStation(stations[0]);
    }
  }, [stations, selectedStation]);

  const filteredStations = stations.filter((s) => {
    const matchesSearch =
      s.station_name.toLowerCase().includes(search.toLowerCase()) ||
      s.city.toLowerCase().includes(search.toLowerCase()) ||
      s.station_id.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (categoryFilter === "ALL") return true;
    if (categoryFilter === "GOOD") return (s.latest_aqi || 0) <= 50;
    if (categoryFilter === "SATISFACTORY") return (s.latest_aqi || 0) > 50 && (s.latest_aqi || 0) <= 100;
    if (categoryFilter === "MODERATE") return (s.latest_aqi || 0) > 100 && (s.latest_aqi || 0) <= 200;
    if (categoryFilter === "POOR_PLUS") return (s.latest_aqi || 0) > 200;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls Toolbar in skills.sh style */}
      <div className="border-b border-neutral-800 pb-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono">
                Interactive Mumbai AQI Map
              </h1>
              <span className="rounded border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-[10px] font-mono text-neutral-400">
                {isLiveMode ? "LIVE REAL-TIME TELEMETRY" : "CPCB ARCHIVE"}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1 font-mono">
              Displaying live atmospheric observations from Open-Meteo & CAAQMS coordinates across Mumbai.
            </p>
          </div>

          {/* Mode Toggle & Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            {onToggleMode && (
              <div className="flex items-center rounded-md border border-neutral-800 bg-neutral-900 p-0.5 text-xs font-mono">
                <button
                  onClick={() => onToggleMode(true)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors cursor-pointer ${
                    isLiveMode
                      ? "bg-white text-black font-semibold"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${isLiveMode ? "bg-emerald-600" : "bg-neutral-600"}`} />
                  Live Feed
                </button>
                <button
                  onClick={() => onToggleMode(false)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors cursor-pointer ${
                    !isLiveMode
                      ? "bg-white text-black font-semibold"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${!isLiveMode ? "bg-cyan-600" : "bg-neutral-600"}`} />
                  CPCB Archive
                </button>
              </div>
            )}

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-500" />
              <input
                type="text"
                placeholder="Search station (e.g. Bandra)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-neutral-800 bg-neutral-900 pl-8 pr-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none transition-colors font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
        <span className="text-neutral-400 flex items-center gap-1 mr-1">
          <Filter className="h-3 w-3 text-neutral-400" /> Filter by AQI:
        </span>
        {[
          { key: "ALL", label: `All Stations (${stations.length})` },
          { key: "GOOD", label: "Good (0-50)", color: "text-emerald-400" },
          { key: "SATISFACTORY", label: "Satisfactory (51-100)", color: "text-lime-400" },
          { key: "MODERATE", label: "Moderate (101-200)", color: "text-yellow-400" },
          { key: "POOR_PLUS", label: "Poor / Severe (201+)", color: "text-rose-400" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setCategoryFilter(f.key)}
            className={`px-3 py-1 rounded-md text-xs font-mono border transition-colors cursor-pointer ${
              categoryFilter === f.key
                ? "bg-white text-black font-semibold border-white"
                : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700"
            }`}
          >
            <span className={f.color}>{f.label}</span>
          </button>
        ))}
      </div>

      {/* Main Map Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Container */}
        <div className="lg:col-span-2 rounded-lg border border-neutral-800 bg-[#09090b] p-2 relative shadow-lg overflow-hidden min-h-[560px]">
          <DynamicMap
            stations={filteredStations}
            selectedStationId={selectedStation?.station_id || null}
            onSelectStation={(stn) => setSelectedStation(stn)}
          />

          {/* Map Legend */}
          <div className="absolute bottom-4 right-4 z-10 rounded-md border border-neutral-800 bg-neutral-950/95 p-3 text-[10px] text-neutral-300 space-y-1.5 font-mono shadow-xl">
            <span className="font-bold text-white uppercase text-[9px] tracking-wider block">CPCB AQI Categories</span>
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Good (0-50)</div>
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-lime-500" /> Satisfactory (51-100)</div>
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-yellow-500" /> Moderate (101-200)</div>
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-orange-500" /> Poor (201-300)</div>
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-500" /> Very Poor (301-400)</div>
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-rose-950" /> Severe (401+)</div>
          </div>
        </div>

        {/* Selected Station Details & Comparison Sidebar */}
        <div className="space-y-4">
          {selectedStation ? (
            <div className="rounded-lg border border-neutral-800 bg-[#09090b] p-5 space-y-4">
              <div>
                <span className="rounded border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-[10px] font-mono text-neutral-400">
                  CAAQMS INSPECTION NODE
                </span>
                <h3 className="text-base font-bold text-white mt-1.5 font-mono">{selectedStation.station_name}</h3>
                <p className="text-xs text-neutral-400 font-mono mt-0.5">
                  {selectedStation.operator} • Lat: <span className="tabular-nums">{selectedStation.latitude}</span>, Lon: <span className="tabular-nums">{selectedStation.longitude}</span>
                </p>
              </div>

              {/* AQI Score */}
              <div className="rounded-md bg-neutral-950 border border-neutral-800 p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-neutral-400 font-mono">Statutory CPCB AQI</span>
                  <div
                    className="text-4xl font-bold mt-0.5 tabular-nums tracking-tight font-mono"
                    style={{ color: getAQIColor(selectedStation.latest_aqi) }}
                  >
                    {selectedStation.latest_aqi ? Math.round(selectedStation.latest_aqi) : "N/A"}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${getAQIBadgeClass(selectedStation.latest_bucket)}`}>
                  {selectedStation.latest_bucket || "Unknown"}
                </span>
              </div>

              {/* Pollutant readings */}
              <div>
                <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider block mb-2 font-mono">
                  Criteria Pollutants
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-neutral-950 border border-neutral-800 p-2.5 rounded-md">
                    <span className="text-neutral-500 block text-[10px] font-mono">PM₂.₅</span>
                    <span className="font-bold text-white font-mono">{formatNum(selectedStation.pm25)} µg/m³</span>
                  </div>
                  <div className="bg-neutral-950 border border-neutral-800 p-2.5 rounded-md">
                    <span className="text-neutral-500 block text-[10px] font-mono">PM₁₀</span>
                    <span className="font-bold text-white font-mono">{formatNum(selectedStation.pm10)} µg/m³</span>
                  </div>
                  <div className="bg-neutral-950 border border-neutral-800 p-2.5 rounded-md">
                    <span className="text-neutral-500 block text-[10px] font-mono">NO₂</span>
                    <span className="font-bold text-white font-mono">{formatNum(selectedStation.no2)} µg/m³</span>
                  </div>
                  <div className="bg-neutral-950 border border-neutral-800 p-2.5 rounded-md">
                    <span className="text-neutral-500 block text-[10px] font-mono">SO₂</span>
                    <span className="font-bold text-white font-mono">{formatNum(selectedStation.so2)} µg/m³</span>
                  </div>
                  <div className="bg-neutral-950 border border-neutral-800 p-2.5 rounded-md">
                    <span className="text-neutral-500 block text-[10px] font-mono">CO</span>
                    <span className="font-bold text-white font-mono">{formatNum(selectedStation.co)} mg/m³</span>
                  </div>
                  <div className="bg-neutral-950 border border-neutral-800 p-2.5 rounded-md">
                    <span className="text-neutral-500 block text-[10px] font-mono">O₃</span>
                    <span className="font-bold text-white font-mono">{formatNum(selectedStation.o3)} µg/m³</span>
                  </div>
                </div>
              </div>

              {/* Station Comparison Section */}
              <div className="border-t border-neutral-800 pt-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-neutral-300">
                  <ArrowRightLeft className="h-3.5 w-3.5 text-neutral-400" />
                  <span>Compare with node:</span>
                </div>
                <select
                  value={compareStation?.station_id || ""}
                  onChange={(e) => {
                    const stn = stations.find((s) => s.station_id === e.target.value) || null;
                    setCompareStation(stn);
                  }}
                  className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-neutral-500 font-mono cursor-pointer"
                >
                  <option value="">Select station to compare...</option>
                  {stations
                    .filter((s) => s.station_id !== selectedStation.station_id)
                    .map((s) => (
                      <option key={s.station_id} value={s.station_id}>
                        {s.station_name}
                      </option>
                    ))}
                </select>

                {compareStation && (
                  <div className="mt-3 p-3 rounded-md bg-neutral-950 border border-neutral-800 text-xs space-y-2 font-mono">
                    <div className="font-bold text-white text-xs">{compareStation.station_name}</div>
                    <div className="flex justify-between text-neutral-300">
                      <span>AQI:</span>
                      <span className="font-bold tabular-nums" style={{ color: getAQIColor(compareStation.latest_aqi) }}>
                        {compareStation.latest_aqi ? Math.round(compareStation.latest_aqi) : "—"} ({compareStation.latest_bucket})
                      </span>
                    </div>
                    <div className="flex justify-between text-neutral-300">
                      <span>AQI Delta:</span>
                      <span className="font-bold text-white tabular-nums">
                        {selectedStation.latest_aqi && compareStation.latest_aqi
                          ? `${(selectedStation.latest_aqi - compareStation.latest_aqi) > 0 ? "+" : ""}${Math.round(selectedStation.latest_aqi - compareStation.latest_aqi)}`
                          : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between text-neutral-300">
                      <span>PM₂.₅ Delta:</span>
                      <span className="font-bold text-white tabular-nums">
                        {selectedStation.pm25 && compareStation.pm25
                          ? `${(selectedStation.pm25 - compareStation.pm25) > 0 ? "+" : ""}${(selectedStation.pm25 - compareStation.pm25).toFixed(1)} µg/m³`
                          : "—"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-neutral-800 bg-[#09090b] p-6 text-center text-xs text-neutral-500 font-mono">
              Click a marker on the map to inspect station details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
