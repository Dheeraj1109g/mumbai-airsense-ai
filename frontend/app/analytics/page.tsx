"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  RefreshCw,
  Search
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";

import { api } from "@/lib/api";
import { Station, Observation, PaginatedResponse } from "@/types";
import { formatDate, formatNum, getAQIBadgeClass, getAQIColor } from "@/lib/utils";

export default function AnalyticsPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>("MH005");
  const [startDate, setStartDate] = useState<string>("2019-06-01");
  const [endDate, setEndDate] = useState<string>("2020-07-01");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(30);

  const [data, setData] = useState<PaginatedResponse<Observation> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getStations().then((stns) => setStations(stns)).catch(console.error);
  }, []);

  const loadObservations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getHistory({
        station_id: selectedStation,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        page,
        page_size: pageSize,
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load historical analytics records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadObservations();
  }, [selectedStation, startDate, endDate, page, pageSize]);

  // Export CSV
  const downloadCSV = () => {
    if (!data || data.items.length === 0) return;
    const headers = [
      "Station_Id",
      "Observation_Date",
      "PM2.5",
      "PM10",
      "NO2",
      "SO2",
      "CO",
      "O3",
      "Official_AQI",
      "Official_Bucket",
      "Calculated_AQI",
      "Calculated_Bucket",
      "Prominent_Pollutant",
      "Data_Provenance",
    ];
    const rows = data.items.map((i) =>
      [
        i.station_id,
        i.observation_date,
        i.pm25 ?? "",
        i.pm10 ?? "",
        i.no2 ?? "",
        i.so2 ?? "",
        i.co ?? "",
        i.o3 ?? "",
        i.official_aqi ?? "",
        i.official_bucket ?? "",
        i.calculated_aqi ?? "",
        i.calculated_bucket ?? "",
        i.prominent_pollutant ?? "",
        i.data_provenance,
      ].join(",")
    );

    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Mumbai_AirSense_${selectedStation}_Analytics.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Prepare chart series (chronological order)
  const chartItems = data ? [...data.items].reverse() : [];
  const chartData = chartItems.map((item) => ({
    date: formatDate(item.observation_date),
    "PM2.5": item.pm25,
    "PM10": item.pm10,
    NO2: item.no2,
    SO2: item.so2,
    AQI: item.calculated_aqi || item.official_aqi,
  }));

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

  return (
    <div className="space-y-6">
      {/* Top Banner & Filter Controls */}
      <div className="sh-card rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Historical Air Quality Analytics
              </h1>
              <span className="sh-badge text-cyan-300 border-cyan-500/40 bg-cyan-950/40">
                CHRONOLOGICAL EXPLORER
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Multi-parameter trend analysis and longitudinal observations across verified CAAQMS monitors.
            </p>
          </div>

          <button
            onClick={downloadCSV}
            className="flex items-center gap-1.5 self-start md:self-auto rounded-xl border border-white/[0.08] bg-slate-900/80 px-3.5 py-2 text-xs font-mono font-medium text-slate-200 hover:bg-white/[0.06] hover:text-white transition-colors"
          >
            <Download className="h-4 w-4 text-cyan-400" />
            Export Selected Records
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-white/[0.08] font-mono text-xs">
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Monitoring Station
            </label>
            <select
              value={selectedStation}
              onChange={(e) => {
                setSelectedStation(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-white/[0.1] bg-slate-900/90 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all font-mono"
            >
              <option value="MUMBAI_CITY">Mumbai City-wide Benchmark</option>
              {stations
                .filter((s) => s.station_id !== "MUMBAI_CITY")
                .map((s) => (
                  <option key={s.station_id} value={s.station_id}>
                    {s.station_name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-white/[0.1] bg-slate-900/90 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-white/[0.1] bg-slate-900/90 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all font-mono"
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="h-48 flex flex-col items-center justify-center gap-3 text-slate-400 sh-card rounded-2xl font-mono">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <span className="text-xs">Querying historical observation records...</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-xs text-red-200 font-mono">
          {error}
        </div>
      )}

      {/* Multi-Pollutant Line Chart */}
      {!loading && (
        <div className="sh-card rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Multi-Pollutant Historical Trajectory</h3>
              <p className="text-xs text-slate-400 font-mono">
                Visualizing PM2.5, PM10, NO2, and overall AQI dynamics over selected period
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">Showing {chartData.length} timeline points</span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} fontFamily="monospace" />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} fontFamily="monospace" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#080e1e",
                    borderColor: "rgba(255,255,255,0.12)",
                    borderRadius: "12px",
                    fontSize: "12px",
                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.6)",
                    color: "#f8fafc",
                    fontFamily: "monospace"
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px", fontFamily: "monospace" }} />
                <Line type="monotone" dataKey="AQI" stroke="#f43f5e" strokeWidth={2.5} dot={false} name="CPCB AQI" />
                <Line type="monotone" dataKey="PM2.5" stroke="#06b6d4" strokeWidth={1.5} dot={false} name="PM2.5 (µg/m³)" />
                <Line type="monotone" dataKey="PM10" stroke="#14b8a6" strokeWidth={1.5} dot={false} name="PM10 (µg/m³)" />
                <Line type="monotone" dataKey="NO2" stroke="#eab308" strokeWidth={1.5} dot={false} name="NO2 (µg/m³)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Data Table with Pagination */}
      {!loading && data && (
        <div className="sh-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <h3 className="text-sm font-bold text-white tracking-tight font-mono">
              Observation Log Table ({data.total.toLocaleString()} total records matched)
            </h3>
            <span className="text-xs text-slate-400 font-mono">Page {data.page} of {totalPages}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-black/40 text-slate-400 uppercase text-[10px] border-b border-white/[0.08]">
                <tr>
                  <th className="py-3 px-3.5">Date</th>
                  <th className="py-3 px-3.5 text-right">PM₂.₅</th>
                  <th className="py-3 px-3.5 text-right">PM₁₀</th>
                  <th className="py-3 px-3.5 text-right">NO₂</th>
                  <th className="py-3 px-3.5 text-right">SO₂</th>
                  <th className="py-3 px-3.5 text-right">CO</th>
                  <th className="py-3 px-3.5 text-right">O₃</th>
                  <th className="py-3 px-3.5 text-right">Calculated AQI</th>
                  <th className="py-3 px-3.5">Category</th>
                  <th className="py-3 px-3.5">Provenance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-300">
                {data.items.map((row) => (
                  <tr key={row.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3 px-3.5 font-semibold text-white">{formatDate(row.observation_date)}</td>
                    <td className="py-3 px-3.5 text-right tabular-nums">{formatNum(row.pm25)}</td>
                    <td className="py-3 px-3.5 text-right tabular-nums">{formatNum(row.pm10)}</td>
                    <td className="py-3 px-3.5 text-right tabular-nums">{formatNum(row.no2)}</td>
                    <td className="py-3 px-3.5 text-right tabular-nums">{formatNum(row.so2)}</td>
                    <td className="py-3 px-3.5 text-right tabular-nums">{formatNum(row.co)}</td>
                    <td className="py-3 px-3.5 text-right tabular-nums">{formatNum(row.o3)}</td>
                    <td className="py-3 px-3.5 text-right font-bold text-white tabular-nums">
                      {row.calculated_aqi ? Math.round(row.calculated_aqi) : "—"}
                    </td>
                    <td className="py-3 px-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-sm ${getAQIBadgeClass(row.calculated_bucket)}`}>
                        {row.calculated_bucket || "Unknown"}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-[10px] text-slate-400">{row.data_provenance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between pt-3 border-t border-white/[0.08] text-xs text-slate-400 font-mono">
            <div>
              Showing <span className="text-slate-200 tabular-nums">{((page - 1) * pageSize) + 1}</span> to <span className="text-slate-200 tabular-nums">{Math.min(page * pageSize, data.total)}</span> of <span className="text-slate-200 tabular-nums">{data.total}</span> records
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-slate-900/80 px-3.5 py-1.5 hover:bg-white/[0.06] disabled:opacity-40 transition-colors font-medium"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-slate-900/80 px-3.5 py-1.5 hover:bg-white/[0.06] disabled:opacity-40 transition-colors font-medium"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
