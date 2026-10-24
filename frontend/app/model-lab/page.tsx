"use client";

import { useEffect, useState } from "react";
import {
  Cpu,
  Download,
  FileText,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  TrendingDown,
  Layers,
  Sparkles,
  Info
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";

import { api } from "@/lib/api";
import { ModelLabSummary, Station } from "@/types";
import { formatDate, formatNum } from "@/lib/utils";
import { generateModelLabPDF } from "@/lib/pdf-export";

export default function ModelLabPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>("MH005");
  const [pollutant, setPollutant] = useState<string>("PM2.5");
  const [labData, setLabData] = useState<ModelLabSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getStations().then((stns) => setStations(stns)).catch(console.error);
  }, []);

  const fetchLabData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getModelLab(selectedStation, pollutant);
      setLabData(res);
    } catch (err: any) {
      setLabData(null);
      setError(err.message || "Failed to load Model Lab diagnostics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabData();
  }, [selectedStation, pollutant]);

  const downloadCSV = () => {
    if (!labData) return;
    const rows = [
      "Model_Code,Display_Name,Model_Type,Version,Sample_Count,Test_MAE,Test_RMSE,Test_MAPE,Coverage_95,Is_Recommended",
    ];
    labData.models.forEach((m) => {
      rows.push(
        `${m.model_code},"${m.display_name}","${m.model_type}",${m.version},${m.sample_count},${m.test_mae},${m.test_rmse},${m.test_mape},${m.coverage_95},${m.is_recommended}`
      );
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Mumbai_AirSense_ModelLab_Report_${selectedStation}_${pollutant}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    if (!labData) return;
    generateModelLabPDF({
      stationId: selectedStation,
      pollutant: pollutant,
      evaluationPeriod: labData.evaluation_period,
      models: labData.models,
    });
  };

  const downloadReport = () => {
    if (!labData) return;
    const blob = new Blob([JSON.stringify(labData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Mumbai_AirSense_ModelLab_Report_${selectedStation}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Toolbar */}
      <div className="sh-card rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Model Lab & Evaluation Benchmark
              </h1>
              <span className="sh-badge text-purple-300 border-purple-500/40 bg-purple-950/40">
                HELD-OUT BENCHMARK
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Held-out out-of-sample backtesting across ARIMA, Prophet, PyTorch LSTM, and Naive Baseline.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={downloadCSV}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-mono text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer"
              title="Download metrics as CSV"
            >
              <Download className="h-3.5 w-3.5 text-neutral-400" />
              Download CSV
            </button>

            <button
              onClick={downloadPDF}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-mono text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer"
              title="Download diagnostic report as PDF"
            >
              <FileText className="h-3.5 w-3.5 text-rose-400" />
              Download PDF
            </button>
          </div>
        </div>

        {/* Station & Pollutant Controls */}
        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-white/[0.08] text-xs font-mono">
          <div className="flex items-center gap-2">
            <label className="text-slate-400 font-bold uppercase text-[11px]">Station:</label>
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className="rounded-xl border border-white/[0.1] bg-slate-900/90 px-3 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="MH005">Bandra, Mumbai (MPCB)</option>
              <option value="MUMBAI_CITY">Mumbai City-wide Benchmark</option>
              {stations
                .filter((s) => s.station_id !== "MH005" && s.station_id !== "MUMBAI_CITY")
                .map((s) => (
                  <option key={s.station_id} value={s.station_id}>
                    {s.station_name}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-slate-400 font-bold uppercase text-[11px]">Target Pollutant:</label>
            <select
              value={pollutant}
              onChange={(e) => setPollutant(e.target.value)}
              className="rounded-xl border border-white/[0.1] bg-slate-900/90 px-3 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="PM2.5">PM2.5</option>
              <option value="PM10">PM10</option>
              <option value="NO2">NO2</option>
            </select>
          </div>
        </div>
      </div>

      {/* Methodological Alert */}
      {labData?.mape_zero_warning && (
        <div className="flex items-start gap-3 rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4 text-cyan-200 text-xs font-mono">
          <Info className="h-4 w-4 text-cyan-400 mt-0.5 shrink-0" />
          <div className="leading-relaxed">
            <span className="font-bold text-cyan-300">Chronological Backtest Methodology: </span>
            {labData.mape_zero_warning}
          </div>
        </div>
      )}

      {loading && (
        <div className="h-48 flex flex-col items-center justify-center gap-3 text-slate-400 sh-card rounded-2xl font-mono">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <span className="text-xs">Evaluating held-out model metrics and residual distributions...</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-xs text-red-200 font-mono">
          {error}
        </div>
      )}

      {/* Model Benchmark Comparison Table */}
      {!loading && labData && (
        <div className="sh-card rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Held-out Test Performance Matrix ({labData.evaluation_period.start} to {labData.evaluation_period.end})
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Evaluation conducted across {labData.evaluation_period.held_out_days} strictly unseen chronological test days.
              </p>
            </div>
            <span className="sh-badge text-emerald-300 border-emerald-500/40 bg-emerald-950/40 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> ZERO LEAKAGE
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-black/40 text-slate-400 uppercase text-[10px] border-b border-white/[0.08]">
                <tr>
                  <th className="py-3 px-3.5">Architecture</th>
                  <th className="py-3 px-3.5">Family / Type</th>
                  <th className="py-3 px-3.5 text-right">Test MAE</th>
                  <th className="py-3 px-3.5 text-right">Test RMSE</th>
                  <th className="py-3 px-3.5 text-right">Test MAPE</th>
                  <th className="py-3 px-3.5 text-right">95% Interval Coverage</th>
                  <th className="py-3 px-3.5">Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-300">
                {labData.models.map((m) => (
                  <tr key={m.model_code} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3 px-3.5 font-bold text-white flex items-center gap-2">
                      <Cpu className="h-3.5 w-3.5 text-cyan-400" />
                      {m.display_name}
                    </td>
                    <td className="py-3 px-3.5 text-slate-400">{m.model_type}</td>
                    <td className="py-3 px-3.5 text-right font-mono text-cyan-300 font-semibold tabular-nums">{formatNum(m.test_mae)}</td>
                    <td className="py-3 px-3.5 text-right font-mono text-white font-bold tabular-nums">{formatNum(m.test_rmse)}</td>
                    <td className="py-3 px-3.5 text-right font-mono tabular-nums">{m.test_mape ? `${formatNum(m.test_mape)}%` : "N/A"}</td>
                    <td className="py-3 px-3.5 text-right font-mono text-teal-300 tabular-nums">{m.coverage_95 ? `${formatNum(m.coverage_95)}%` : "—"}</td>
                    <td className="py-3 px-3.5">
                      {m.is_recommended ? (
                        <span className="sh-badge text-emerald-300 border-emerald-500/40 bg-emerald-950/40">
                          BEST RMSE
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Baseline</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Residual Diagnostics Grid */}
      {!loading && labData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {labData.models.map((m) => (
            <div key={m.model_code} className="sh-card rounded-xl p-4 space-y-3 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{m.display_name}</span>
                <span className="sh-badge text-[10px] text-slate-400">[{m.model_code}]</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-black/30 p-2.5 rounded-xl border border-white/[0.06]">
                  <span className="text-slate-400 block text-[10px]">Residual Mean</span>
                  <span className="font-semibold text-white tabular-nums">{formatNum(m.residual_summary?.mean)}</span>
                </div>
                <div className="bg-black/30 p-2.5 rounded-xl border border-white/[0.06]">
                  <span className="text-slate-400 block text-[10px]">Residual Std</span>
                  <span className="font-semibold text-white tabular-nums">{formatNum(m.residual_summary?.std)}</span>
                </div>
                <div className="bg-black/30 p-2.5 rounded-xl border border-white/[0.06]">
                  <span className="text-slate-400 block text-[10px]">Underpredict %</span>
                  <span className="font-semibold text-amber-400 tabular-nums">{m.residual_summary?.underprediction_rate}%</span>
                </div>
                <div className="bg-black/30 p-2.5 rounded-xl border border-white/[0.06]">
                  <span className="text-slate-400 block text-[10px]">Overpredict %</span>
                  <span className="font-semibold text-teal-400 tabular-nums">{m.residual_summary?.overprediction_rate}%</span>
                </div>
              </div>

              {m.hyperparameters && (
                <div className="text-[10px] text-slate-500 font-mono truncate">
                  Config: {JSON.stringify(m.hyperparameters)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actual vs Test Plot */}
      {!loading && labData && labData.backtest_series.length > 0 && (
        <div className="sh-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Held-out Actual Test Series</h3>
              <p className="text-xs text-slate-400 font-mono">Ground-truth validation sequence for {selectedStation}</p>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={labData.backtest_series.map((p) => ({ date: formatDate(p.date), Actual: p.actual }))}>
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
                <Line type="monotone" dataKey="Actual" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} name="Actual Ground Truth" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
