"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  Download,
  FileText,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Layers,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  BarChart2,
  Sparkles,
  ArrowRight
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";

import { api } from "@/lib/api";
import { Station, ForecastResponse, MultiModelForecastComparisonResponse } from "@/types";
import { formatDate, formatNum, getAQIBadgeClass } from "@/lib/utils";
import { generateForecastPDF } from "@/lib/pdf-export";

export default function ForecastPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>("MH005");
  const [pollutant, setPollutant] = useState<string>("PM2.5");
  const [modelCode, setModelCode] = useState<string>("compare"); // 'arima' | 'prophet' | 'lstm' | 'baseline' | 'compare'
  const [horizonDays, setHorizonDays] = useState<number>(7);
  const [isLiveMode, setIsLiveMode] = useState<boolean>(true); // Defaults to real-time forward forecasting!

  const [singleForecast, setSingleForecast] = useState<ForecastResponse | null>(null);
  const [multiForecast, setMultiForecast] = useState<MultiModelForecastComparisonResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getStations().then((stns) => setStations(stns)).catch(console.error);
  }, []);

  const fetchForecast = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isLiveMode) {
        if (modelCode === "compare") {
          const res = await api.getLiveCompareForecasts(selectedStation, pollutant, horizonDays);
          setMultiForecast(res);
          setSingleForecast(null);
        } else {
          const res = await api.getLiveForecast(selectedStation, pollutant, modelCode, horizonDays);
          setSingleForecast(res);
          setMultiForecast(null);
        }
      } else {
        if (modelCode === "compare") {
          const res = await api.compareForecasts(selectedStation, pollutant, horizonDays);
          setMultiForecast(res);
          setSingleForecast(null);
        } else {
          const res = await api.getForecast({
            station_id: selectedStation,
            pollutant,
            model_code: modelCode,
            horizon_days: horizonDays,
          });
          setSingleForecast(res);
          setMultiForecast(null);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate forecasting results.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, [selectedStation, pollutant, modelCode, horizonDays, isLiveMode]);

  // Export CSV function
  const downloadCSV = () => {
    let rows: string[] = [];
    if (singleForecast) {
      rows.push("Forecast_Date,Station_Id,Pollutant,Predicted_Value,Lower_95,Upper_95,Predicted_AQI,AQI_Category");
      singleForecast.forecast_points.forEach((p) => {
        rows.push(
          `${p.forecast_date},${singleForecast.station_id},${singleForecast.pollutant},${p.predicted_value},${p.lower_bound || ""},${p.upper_bound || ""},${p.calculated_predicted_aqi || ""},${p.predicted_aqi_bucket || ""}`
        );
      });
    } else if (multiForecast) {
      rows.push("Forecast_Date,Model_Code,Model_Name,Predicted_Value,Calculated_AQI,AQI_Bucket");
      multiForecast.models.forEach((m) => {
        m.forecast_points.forEach((p) => {
          rows.push(
            `${p.forecast_date},${m.model_code},"${m.model_name}",${p.predicted_value},${p.calculated_predicted_aqi || ""},${p.predicted_aqi_bucket || ""}`
          );
        });
      });
    }

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Mumbai_AirSense_${selectedStation}_${pollutant}_Forecast.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export PDF function
  const downloadPDF = () => {
    const stn = stations.find((s) => s.station_id === selectedStation);
    const stationName = stn?.station_name || (selectedStation === "MUMBAI_CITY" ? "Mumbai Composite Aggregate" : selectedStation);

    if (singleForecast) {
      generateForecastPDF({
        stationId: singleForecast.station_id,
        stationName: stationName,
        pollutant: singleForecast.pollutant,
        mode: isLiveMode ? "Live Real-Time Telemetry" : "CPCB Historical Archive",
        generatedAt: singleForecast.generated_at,
        bestModelName: singleForecast.model_code.toUpperCase(),
        forecastPoints: singleForecast.forecast_points.map((p) => ({
          date: p.forecast_date,
          value: p.predicted_value,
          lower: p.lower_bound ?? p.predicted_value * 0.8,
          upper: p.upper_bound ?? p.predicted_value * 1.2,
          aqi: p.calculated_predicted_aqi,
          bucket: p.predicted_aqi_bucket,
        })),
      });
    } else if (multiForecast) {
      const best = multiForecast.models.find((m) => m.best_model) || multiForecast.models[0];
      generateForecastPDF({
        stationId: multiForecast.station_id,
        stationName: stationName,
        pollutant: multiForecast.pollutant,
        mode: isLiveMode ? "Live Real-Time Telemetry" : "CPCB Historical Archive",
        generatedAt: multiForecast.generated_at,
        bestModelName: best.model_name,
        bestModelRmse: best.test_rmse,
        bestModelMae: best.test_mae,
        forecastPoints: best.forecast_points.map((p) => ({
          date: p.forecast_date,
          value: p.predicted_value,
          lower: p.lower_bound ?? p.predicted_value * 0.8,
          upper: p.upper_bound ?? p.predicted_value * 1.2,
          aqi: p.calculated_predicted_aqi,
          bucket: p.predicted_aqi_bucket,
        })),
        models: multiForecast.models.map((m) => ({
          code: m.model_code,
          name: m.model_name,
          mae: m.test_mae,
          rmse: m.test_rmse,
          isBest: m.best_model,
        })),
      });
    }
  };

  // Build chart series
  let chartData: any[] = [];
  if (singleForecast) {
    singleForecast.historical_context.forEach((h) => {
      chartData.push({
        date: formatDate(h.date),
        Historical: h.value,
      });
    });
    singleForecast.forecast_points.forEach((f) => {
      chartData.push({
        date: formatDate(f.forecast_date),
        Predicted: f.predicted_value,
        Upper_95: f.upper_bound,
        Lower_95: f.lower_bound,
      });
    });
  } else if (multiForecast && multiForecast.models.length > 0) {
    const dates = multiForecast.models[0].forecast_points.map((p) => p.forecast_date);
    dates.forEach((d, idx) => {
      const entry: any = { date: formatDate(d) };
      multiForecast.models.forEach((m) => {
        entry[m.model_code.toUpperCase()] = m.forecast_points[idx]?.predicted_value;
      });
      chartData.push(entry);
    });
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Config Toolbar - skills.sh style */}
      <div className="sh-card rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                7-Day Air Quality Forecasting Lab
              </h1>
              <span
                className={`sh-badge transition-colors ${
                  isLiveMode
                    ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
                    : "border-teal-500/40 bg-teal-950/40 text-teal-300"
                }`}
              >
                <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 ${isLiveMode ? "bg-emerald-400 animate-pulse" : "bg-teal-400"}`} />
                {isLiveMode ? "LIVE FORWARD PROJECTION" : "HELD-OUT BACKTEST EVALUATION"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              {isLiveMode
                ? "Real-time atmospheric predictions starting today forward across all 14 CAAQMS stations."
                : "Select station, target pollutant, and model architecture to project future atmospheric conditions."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Live vs Archive Toggle */}
            <div className="inline-flex items-center flex-nowrap rounded-lg border border-neutral-800 bg-neutral-950 p-1 text-xs font-mono">
              <button
                type="button"
                onClick={() => setIsLiveMode(true)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
                  isLiveMode
                    ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-semibold"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isLiveMode ? "bg-emerald-400 animate-pulse" : "bg-neutral-600"}`} />
                Live Telemetry
              </button>
              <button
                type="button"
                onClick={() => setIsLiveMode(false)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
                  !isLiveMode
                    ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-semibold"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${!isLiveMode ? "bg-cyan-400" : "bg-neutral-600"}`} />
                CPCB Archive
              </button>
            </div>

            <button
              onClick={downloadCSV}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-mono text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
              title="Download numerical data as CSV spreadsheet"
            >
              <Download className="h-3.5 w-3.5 text-neutral-400" />
              Download CSV
            </button>

            <button
              onClick={downloadPDF}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-mono text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
              title="Download official CPCB forecast report as printable PDF"
            >
              <FileText className="h-3.5 w-3.5 text-rose-400" />
              Download PDF
            </button>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-white/[0.08] font-mono text-xs">
          {/* Station */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Monitoring Station
            </label>
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className="w-full rounded-xl border border-white/[0.1] bg-slate-900/90 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all font-mono"
            >
              <option value="MUMBAI_CITY">Mumbai City-wide Aggregate</option>
              {stations
                .filter((s) => s.station_id !== "MUMBAI_CITY")
                .map((s) => (
                  <option key={s.station_id} value={s.station_id}>
                    {s.station_name}
                  </option>
                ))}
            </select>
          </div>

          {/* Pollutant */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Target Pollutant
            </label>
            <select
              value={pollutant}
              onChange={(e) => setPollutant(e.target.value)}
              className="w-full rounded-xl border border-white/[0.1] bg-slate-900/90 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all font-mono"
            >
              <option value="PM2.5">PM2.5 (Fine Particulate &lt; 2.5 µm)</option>
              <option value="PM10">PM10 (Coarse Particulate &lt; 10 µm)</option>
              <option value="NO2">NO2 (Nitrogen Dioxide)</option>
            </select>
          </div>

          {/* Model Architecture */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Forecasting Model
            </label>
            <select
              value={modelCode}
              onChange={(e) => setModelCode(e.target.value)}
              className="w-full rounded-xl border border-white/[0.1] bg-slate-900/90 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all font-mono"
            >
              <option value="compare">Multi-Model Comparison (All 4)</option>
              <option value="arima">ARIMA (1,1,1) — Statistical Baseline</option>
              <option value="prophet">Prophet — Additive Seasonality</option>
              <option value="lstm">LSTM — PyTorch Recurrent Window</option>
              <option value="baseline">Persistence Baseline (Naive Benchmark)</option>
            </select>
          </div>

          {/* Horizon */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Forecast Horizon
            </label>
            <select
              value={horizonDays}
              onChange={(e) => setHorizonDays(Number(e.target.value))}
              className="w-full rounded-xl border border-white/[0.1] bg-slate-900/90 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all font-mono"
            >
              <option value={7}>7 Days (Recommended Standard)</option>
              <option value={14}>14 Days (Extended Horizon)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Explicit Disclaimer Alert */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-amber-200 text-xs font-mono">
        <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
        <div className="leading-relaxed">
          <span className="font-bold text-amber-300">Methodological Notice: </span>
          Air quality forecasts are statistical and neural estimates derived from continuous meteorological and CAAQMS telemetry.
          Rapid maritime boundary layer shifts or localized emissions may introduce variances.
        </div>
      </div>

      {loading && (
        <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400 sh-card rounded-2xl font-mono">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <span className="text-xs">Computing time-series predictions and statutory CPCB sub-index breakpoints...</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-xs text-red-200 font-mono">
          {error}
        </div>
      )}

      {/* Main Forecast Visualization Chart */}
      {!loading && (
        <div className="sh-card rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {modelCode === "compare"
                  ? `Comparative Multi-Model 7-Day Forecast: ${pollutant}`
                  : `${modelCode.toUpperCase()} Forecast & 95% Confidence Band: ${pollutant}`}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Units: µg/m³ • Station: <strong className="text-slate-200">{selectedStation}</strong>
              </p>
            </div>
            {multiForecast && (
              <span className="sh-badge text-teal-300 border-teal-500/40 bg-teal-950/40">
                {multiForecast.recommendation_rationale}
              </span>
            )}
          </div>

          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
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

                {singleForecast && (
                  <>
                    <Area type="monotone" dataKey="Upper_95" stroke="#334155" fill="#1e293b" fillOpacity={0.3} name="95% Upper Bound" />
                    <Line type="monotone" dataKey="Historical" stroke="#64748b" strokeWidth={2} dot={false} name="Historical Observed" />
                    <Line type="monotone" dataKey="Predicted" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 4 }} name="Predicted Trajectory" />
                    <Area type="monotone" dataKey="Lower_95" stroke="#334155" fillOpacity={0} name="95% Lower Bound" />
                  </>
                )}

                {multiForecast && (
                  <>
                    <Line type="monotone" dataKey="ARIMA" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 3 }} name="ARIMA (1,1,1)" />
                    <Line type="monotone" dataKey="PROPHET" stroke="#14b8a6" strokeWidth={2} dot={{ r: 3 }} name="Prophet" />
                    <Line type="monotone" dataKey="LSTM" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} name="PyTorch LSTM" />
                    <Line type="monotone" dataKey="BASELINE" stroke="#eab308" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Persistence Baseline" />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Detailed Values Table */}
      {!loading && singleForecast && (
        <div className="sh-card rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-3 font-mono">Daily Forecast Telemetry & Derived NAQI Breakpoints</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-black/40 text-slate-400 uppercase text-[10px] border-b border-white/[0.08]">
                <tr>
                  <th className="py-3 px-3.5">Forecast Date</th>
                  <th className="py-3 px-3.5">Predicted {pollutant}</th>
                  <th className="py-3 px-3.5">95% Confidence Band</th>
                  <th className="py-3 px-3.5">Derived CPCB AQI</th>
                  <th className="py-3 px-3.5">Projected Health Bucket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-300">
                {singleForecast.forecast_points.map((pt) => (
                  <tr key={pt.forecast_date} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3 px-3.5 font-semibold text-white">{formatDate(pt.forecast_date)}</td>
                    <td className="py-3 px-3.5 font-bold text-cyan-400 tabular-nums">{formatNum(pt.predicted_value)} µg/m³</td>
                    <td className="py-3 px-3.5 text-slate-400 tabular-nums">
                      [{formatNum(pt.lower_bound)} — {formatNum(pt.upper_bound)}]
                    </td>
                    <td className="py-3 px-3.5 font-black text-white tabular-nums">
                      {pt.calculated_predicted_aqi ? Math.round(pt.calculated_predicted_aqi) : "—"}
                    </td>
                    <td className="py-3 px-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border shadow-sm ${getAQIBadgeClass(pt.predicted_aqi_bucket)}`}>
                        {pt.predicted_aqi_bucket || "Unknown"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Multi-Model Comparison Table */}
      {!loading && multiForecast && (
        <div className="sh-card rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-3 font-mono">Model Architectural Comparison on Unseen Held-out Test Data</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-black/40 text-slate-400 uppercase text-[10px] border-b border-white/[0.08]">
                <tr>
                  <th className="py-3 px-3.5">Model Architecture</th>
                  <th className="py-3 px-3.5 text-right">Test MAE</th>
                  <th className="py-3 px-3.5 text-right">Test RMSE</th>
                  <th className="py-3 px-3.5 text-right">Test MAPE</th>
                  <th className="py-3 px-3.5">Empirical Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-300">
                {multiForecast.models.map((m) => (
                  <tr key={m.model_code} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3 px-3.5 font-semibold text-white flex items-center gap-2">
                      <Cpu className="h-3.5 w-3.5 text-cyan-400" />
                      {m.model_name}
                      {m.best_model && (
                        <span className="sh-badge text-emerald-300 border-emerald-500/40 bg-emerald-950/40">
                          BEST RMSE
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-right tabular-nums">{formatNum(m.test_mae)}</td>
                    <td className="py-3 px-3.5 text-right font-bold text-white tabular-nums">{formatNum(m.test_rmse)}</td>
                    <td className="py-3 px-3.5 text-right tabular-nums">{m.test_mape ? `${formatNum(m.test_mape)}%` : "N/A"}</td>
                    <td className="py-3 px-3.5 text-slate-400">
                      {m.best_model ? "Empirically Verified Best" : "Viable Benchmark"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
