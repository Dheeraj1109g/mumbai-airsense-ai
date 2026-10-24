"use client";

import { useEffect, useState } from "react";
import {
  Scale,
  ShieldCheck,
  AlertTriangle,
  Download,
  RefreshCw,
  HeartPulse,
  ExternalLink,
  MapPin,
  Clock,
  Layers,
  CheckCircle2
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";

import { api } from "@/lib/api";
import { FairnessReport, HealthCategoryGuidance } from "@/types";
import { getAQIBadgeClass } from "@/lib/utils";

export default function FairnessPage() {
  const [fairness, setFairness] = useState<FairnessReport | null>(null);
  const [healthGuidance, setHealthGuidance] = useState<HealthCategoryGuidance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [fData, hData] = await Promise.all([
          api.getFairness(),
          api.getHealthGuidance()
        ]);
        setFairness(fData);
        setHealthGuidance(hData);
      } catch (err: any) {
        setError(err.message || "Failed to load fairness analysis.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const downloadReport = () => {
    if (!fairness) return;
    const blob = new Blob([JSON.stringify(fairness, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Mumbai_AirSense_Fairness_and_Reliability_Report.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Prepare missing data rates chart
  const missingData = fairness?.stations_coverage.map((s) => ({
    station: s.station_name.split(",")[0],
    "PM2.5 Missing %": s.pm25_missing_pct,
    "PM10 Missing %": s.pm10_missing_pct,
  })) || [];

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="sh-card rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Fairness, Bias & Reliability Analysis
              </h1>
              <span className="sh-badge text-amber-300 border-amber-500/40 bg-amber-950/40">
                AUDITING ENGINE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Rigorous evaluation of geographic sensor distribution, missing observation rates, seasonal variations, and model limitations.
            </p>
          </div>

          <button
            onClick={downloadReport}
            className="flex items-center gap-1.5 self-start md:self-auto rounded-xl border border-white/[0.08] bg-slate-900/80 px-3.5 py-2 text-xs font-mono font-medium text-slate-200 hover:bg-white/[0.06] hover:text-white transition-colors"
          >
            <Download className="h-4 w-4 text-cyan-400" />
            Download Academic Audit Report
          </button>
        </div>
      </div>

      {loading && (
        <div className="h-48 flex flex-col items-center justify-center gap-3 text-slate-400 sh-card rounded-2xl font-mono">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <span className="text-xs">Computing station completeness matrices and seasonal patterns...</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-xs text-red-200 font-mono">
          {error}
        </div>
      )}

      {/* Disclaimers & Ethics Alert */}
      {!loading && fairness && (
        <div className="sh-card rounded-2xl border-amber-500/30 bg-amber-950/20 p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-sm font-mono">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Key Methodological & Ethical Disclaimers
          </div>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-amber-200/90 leading-relaxed font-sans">
            {fairness.academic_report.ethical_and_methodological_disclaimers.map((disc, idx) => (
              <li key={idx}>{disc}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Station Coverage & Missing Data Rates Chart */}
      {!loading && (
        <div className="sh-card rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Station-Level Sensor Missingness Rates (%)</h3>
              <p className="text-xs text-slate-400 font-mono">Comparing dropout frequencies across Mumbai & Navi Mumbai CAAQMS nodes</p>
            </div>
            <span className="text-xs text-slate-400 font-mono">Lower percentage = higher telemetry reliability</span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={missingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="station" stroke="#64748b" fontSize={11} tickLine={false} fontFamily="monospace" />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit="%" fontFamily="monospace" />
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
                <Bar dataKey="PM2.5 Missing %" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                <Bar dataKey="PM10 Missing %" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Station Reliability Matrix Table */}
      {!loading && fairness && (
        <div className="sh-card rounded-2xl p-5 space-y-4">
          <h3 className="text-base font-bold text-white tracking-tight font-mono">Geographic Coverage & Reliability Matrix</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-black/40 text-slate-400 uppercase text-[10px] border-b border-white/[0.08]">
                <tr>
                  <th className="py-3 px-3.5">Station Name</th>
                  <th className="py-3 px-3.5">Area Typology</th>
                  <th className="py-3 px-3.5 text-right">Total Recorded</th>
                  <th className="py-3 px-3.5 text-right">Valid PM₂.₅</th>
                  <th className="py-3 px-3.5 text-right">Missing %</th>
                  <th className="py-3 px-3.5 text-right">AQI Days</th>
                  <th className="py-3 px-3.5 text-center">Reliability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-300">
                {fairness.stations_coverage.map((s) => (
                  <tr key={s.station_id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-white">
                      {s.station_name} <span className="text-[10px] text-slate-500 font-mono">[{s.station_id}]</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{s.area_type}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{s.total_days_recorded.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{s.pm25_valid_count.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right text-cyan-300 tabular-nums">{s.pm25_missing_pct}%</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{s.valid_aqi_days.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`sh-badge text-[10px] ${
                          s.reliability_tier === "High"
                            ? "bg-emerald-950/70 text-emerald-300 border-emerald-500/40"
                            : s.reliability_tier === "Medium"
                            ? "bg-yellow-950/70 text-yellow-300 border-yellow-500/40"
                            : "bg-red-950/70 text-red-300 border-red-500/40"
                        }`}
                      >
                        {s.reliability_tier}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Seasonal Patterns Section */}
      {!loading && fairness && (
        <div className="sh-card rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white font-mono">Mumbai Seasonal Climatological Dynamics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {fairness.seasonal_patterns.map((sp) => (
              <div key={sp.season} className="rounded-xl border border-white/[0.06] bg-black/30 p-3.5 space-y-2 font-mono">
                <span className="font-bold text-xs text-cyan-300 block">{sp.season}</span>
                <p className="text-[11px] text-slate-300 leading-relaxed font-sans">{sp.characteristics}</p>
                <div className="pt-2 border-t border-white/[0.06] text-[10px] text-slate-400">
                  Typical AQI: <span className="font-semibold text-white">{sp.typical_aqi_range}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Official CPCB Non-Diagnostic Health Guidance Section */}
      {!loading && healthGuidance.length > 0 && (
        <div className="sh-card rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-rose-400" />
                <h3 className="text-sm font-bold text-white">Official Indian Non-Diagnostic Health Guidance</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Precautionary guidance based on official Central Pollution Control Board (CPCB) NAQI health criteria.
              </p>
            </div>
            <a
              href="https://cpcb.nic.in/air-quality-index/"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 self-start sm:self-auto font-mono"
            >
              CPCB Document <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {healthGuidance.map((item) => (
              <div
                key={item.category}
                className="rounded-xl border border-white/[0.06] bg-black/30 p-4 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="px-2.5 py-0.5 rounded text-xs font-bold font-mono"
                      style={{
                        backgroundColor: `${item.color_code}20`,
                        color: item.color_code,
                        border: `1px solid ${item.color_code}50`,
                      }}
                    >
                      {item.category}
                    </span>
                    <span className="text-xs font-mono font-semibold text-slate-400">{item.aqi_range}</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block font-mono">Public Advisory</span>
                      <p className="text-slate-300 mt-0.5 leading-relaxed">{item.general_population_advice}</p>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block font-mono">Sensitive Groups</span>
                      <p className="text-slate-300 mt-0.5 leading-relaxed">{item.sensitive_groups_advice}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/[0.06] text-[10px] text-slate-400 flex justify-between font-mono">
                  <span>Source: {item.official_source}</span>
                  <span>Verified: {item.verified_date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
