"use client";

import { CheckCircle2, ShieldCheck, Cpu, Database, Activity, Terminal } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Hero Header */}
      <div className="sh-card rounded-2xl p-6 sm:p-7 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="sh-badge text-cyan-300 border-cyan-500/40 bg-cyan-950/40">
            CAPSTONE DELIVERABLE
          </span>
          <span className="sh-badge text-slate-300 border-white/[0.1] bg-black/40">
            V2.0 PRODUCTION
          </span>
          <span className="sh-badge text-emerald-300 border-emerald-500/40 bg-emerald-950/40">
            CPCB NAQI 2014
          </span>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight sm:text-3xl">
          Mumbai AirSense AI — Platform Documentation & Academic Report
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-3xl font-mono">
          An intelligent air-quality monitoring and 7-day forecasting platform for the Mumbai Metropolitan Region (MMR),
          Maharashtra, India. Engineered with Next.js 15, FastAPI, SQLite/PostgreSQL, and time-series forecasting models
          (ARIMA, Prophet, and PyTorch LSTM).
        </p>
      </div>

      {/* Abstract & Problem Statement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="sh-card rounded-2xl p-5 space-y-2">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400 font-mono">1. Project Abstract</h2>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            Rapid urbanization, maritime meteorological interactions, vehicular exhaust, and coastal industrial activities
            create complex, localized air-quality dynamics across Mumbai. <strong>Mumbai AirSense AI</strong> establishes
            an end-to-end environmental intelligence platform that unifies 14 official Continuous Ambient Air Quality
            Monitoring Stations (CAAQMS), standardizes calculations to the statutory Central Pollution Control Board (CPCB)
            National Air Quality Index (NAQI) protocol, and deploys comparative time-series forecasting (ARIMA, Prophet, and PyTorch LSTM)
            with 95% uncertainty quantification.
          </p>
        </div>

        <div className="sh-card rounded-2xl p-5 space-y-2">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400 font-mono">2. Problem Statement</h2>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            Existing commercial air quality applications frequently suffer from four critical deficiencies:
            (1) misleadingly substituting US EPA breakpoints for India&apos;s statutory CPCB NAQI standards,
            (2) presenting sparse historical data as real-time observations,
            (3) concealing spatial sensor coverage disparities between coastal and inland neighborhoods, and
            (4) asserting neural network superiority without conducting held-out chronological test benchmarks against statistical baselines.
          </p>
        </div>
      </div>

      {/* Official CPCB Methodology */}
      <div className="sh-card rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400 font-mono">
          3. Statutory Indian CPCB NAQI Calculation Methodology
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          The Central Pollution Control Board (Ministry of Environment, Forest and Climate Change) specifies a linear segmented
          interpolation formula to convert pollutant concentrations \(C_p\) into a sub-index \(I_p\):
        </p>
        <div className="rounded-xl bg-black/50 border border-white/[0.08] p-3 text-xs font-mono text-cyan-300 text-center">
          {"I_p = [ (I_HI - I_LO) / (B_HI - B_LO) ] * (C_p - B_LO) + I_LO"}
        </div>
        <p className="text-xs text-slate-400 leading-relaxed font-mono">
          The overall station AQI is determined by \(\max(I_1, I_2, \ldots, I_n)\).
          Statutory completeness requires at least 3 valid pollutants, of which one must be a particulate (PM2.5 or PM10).
          The pollutant that yields the maximum sub-index is designated as the <strong>Prominent Pollutant</strong>.
        </p>

        {/* CPCB Breakpoint Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-black/40 text-slate-400 uppercase text-[10px] border-b border-white/[0.08]">
              <tr>
                <th className="py-2.5 px-3">AQI Category</th>
                <th className="py-2.5 px-3">Sub-Index Range</th>
                <th className="py-2.5 px-3">PM₂.₅ (24h)</th>
                <th className="py-2.5 px-3">PM₁₀ (24h)</th>
                <th className="py-2.5 px-3">NO₂ (24h)</th>
                <th className="py-2.5 px-3">SO₂ (24h)</th>
                <th className="py-2.5 px-3">CO (8h)</th>
                <th className="py-2.5 px-3">O₃ (8h)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-slate-300">
              <tr>
                <td className="py-2 px-3 font-semibold text-emerald-400">Good</td>
                <td className="py-2 px-3 tabular-nums">0 – 50</td>
                <td className="py-2 px-3 tabular-nums">0 – 30 µg/m³</td>
                <td className="py-2 px-3 tabular-nums">0 – 50 µg/m³</td>
                <td className="py-2 px-3 tabular-nums">0 – 40 µg/m³</td>
                <td className="py-2 px-3 tabular-nums">0 – 40 µg/m³</td>
                <td className="py-2 px-3 tabular-nums">0 – 1.0 mg/m³</td>
                <td className="py-2 px-3 tabular-nums">0 – 50 µg/m³</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-lime-400">Satisfactory</td>
                <td className="py-2 px-3 tabular-nums">51 – 100</td>
                <td className="py-2 px-3 tabular-nums">31 – 60 µg/m³</td>
                <td className="py-2 px-3 tabular-nums">51 – 100 µg/m³</td>
                <td className="py-2 px-3 tabular-nums">41 – 80 µg/m³</td>
                <td className="py-2 px-3 tabular-nums">41 – 80 µg/m³</td>
                <td className="py-2 px-3 tabular-nums">1.1 – 2.0 mg/m³</td>
                <td className="py-2 px-3 tabular-nums">51 – 100 µg/m³</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-yellow-400">Moderate</td>
                <td className="py-2 px-3 tabular-nums">101 – 200</td>
                <td className="py-2 px-3 tabular-nums">61 – 90 µg/m³</td>
                <td className="py-2 px-3 tabular-nums">101 – 250 µg/m³</td>
                <td className="py-2 px-3 tabular-nums">81 – 180 µg/m³</td>
                <td className="py-2 px-3 tabular-nums">81 – 380 µg/m³</td>
                <td className="py-2 px-3 tabular-nums">2.1 – 10.0 mg/m³</td>
                <td className="py-2 px-3 tabular-nums">101 – 168 µg/m³</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-orange-400">Poor</td>
                <td className="py-2 px-3 tabular-nums">201 – 300</td>
                <td className="py-2 px-3 tabular-nums">91 – 120 µg/m³</td>
                <td className="py-2 px-3 tabular-nums">251 – 350 µg/m³</td>
                <td className="py-2 px-3 tabular-nums">181 – 280 µg/m³</td>
                <td className="py-2 px-3 tabular-nums">381 – 800 µg/m³</td>
                <td className="py-2 px-3 tabular-nums">10.1 – 17.0 mg/m³</td>
                <td className="py-2 px-3 tabular-nums">169 – 208 µg/m³</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-red-400">Very Poor</td>
                <td className="py-2 px-3 tabular-nums">301 – 400</td>
                <td className="py-2 px-3 tabular-nums">121 – 250 µg/m³</td>
                <td className="py-2 px-3 tabular-nums">351 – 430 µg/m³</td>
                <td className="py-2 px-3 tabular-nums">281 – 400 µg/m³</td>
                <td className="py-2 px-3 tabular-nums">801 – 1600 µg/m³</td>
                <td className="py-2 px-3 tabular-nums">17.1 – 34.0 mg/m³</td>
                <td className="py-2 px-3 tabular-nums">209 – 748 µg/m³</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-rose-500">Severe</td>
                <td className="py-2 px-3 tabular-nums">401 – 500</td>
                <td className="py-2 px-3 tabular-nums">250+ µg/m³</td>
                <td className="py-2 px-3 tabular-nums">430+ µg/m³</td>
                <td className="py-2 px-3 tabular-nums">400+ µg/m³</td>
                <td className="py-2 px-3 tabular-nums">1600+ µg/m³</td>
                <td className="py-2 px-3 tabular-nums">34.0+ mg/m³</td>
                <td className="py-2 px-3 tabular-nums">748+ µg/m³</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Machine Learning Methodology */}
      <div className="sh-card rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400 font-mono">
          4. Machine Learning & Forecasting Architecture
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-white/[0.06] bg-black/30 p-3.5 space-y-1.5">
            <span className="font-bold text-xs text-white font-mono">1. Persistence Baseline</span>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Assumes \(y(t+h) = y(t)\). Minimal benchmark that any valid time-series model must outperform.
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-black/30 p-3.5 space-y-1.5">
            <span className="font-bold text-xs text-cyan-400 font-mono">2. ARIMA (1,1,1)</span>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Box-Jenkins statistical model capturing autoregressive lag correlation and moving-average shock smoothing.
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-black/30 p-3.5 space-y-1.5">
            <span className="font-bold text-xs text-teal-400 font-mono">3. Facebook Prophet</span>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Decomposable additive model fitting weekly workweek commuting cycles and annual meteorological patterns.
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-black/30 p-3.5 space-y-1.5">
            <span className="font-bold text-xs text-purple-400 font-mono">4. PyTorch LSTM</span>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Recurrent neural network learning non-linear memory representations from sliding 14-day observation windows.
            </p>
          </div>
        </div>
      </div>

      {/* Software Architecture & Database Schema */}
      <div className="sh-card rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400 font-mono">
          5. System Architecture & Database Entities
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed font-mono">
          The database schema is managed via <strong>Alembic</strong> migrations and persists across 6 core relational tables:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
          <div className="bg-black/30 border border-white/[0.06] p-3 rounded-xl">
            <span className="text-cyan-400 font-bold">monitoring_stations</span>
            <p className="text-slate-400 text-[11px] mt-1 font-sans">Station ID, name, operator, verified lat/lon, status.</p>
          </div>
          <div className="bg-black/30 border border-white/[0.06] p-3 rounded-xl">
            <span className="text-cyan-400 font-bold">observations</span>
            <p className="text-slate-400 text-[11px] mt-1 font-sans">Daily pollutant concentrations, official reported AQI, calculated NAQI, provenance.</p>
          </div>
          <div className="bg-black/30 border border-white/[0.06] p-3 rounded-xl">
            <span className="text-cyan-400 font-bold">model_versions</span>
            <p className="text-slate-400 text-[11px] mt-1 font-sans">Model code, version tag, hyperparameters, serialized artifact path, timestamp.</p>
          </div>
          <div className="bg-black/30 border border-white/[0.06] p-3 rounded-xl">
            <span className="text-cyan-400 font-bold">model_metrics</span>
            <p className="text-slate-400 text-[11px] mt-1 font-sans">Held-out test split, sample count, MAE, RMSE, MAPE, 95% coverage, residual moments.</p>
          </div>
          <div className="bg-black/30 border border-white/[0.06] p-3 rounded-xl">
            <span className="text-cyan-400 font-bold">forecast_runs</span>
            <p className="text-slate-400 text-[11px] mt-1 font-sans">Forecast execution timestamp, station ID, horizon days, model version ID.</p>
          </div>
          <div className="bg-black/30 border border-white/[0.06] p-3 rounded-xl">
            <span className="text-cyan-400 font-bold">forecast_values</span>
            <p className="text-slate-400 text-[11px] mt-1 font-sans">Future date, predicted concentration, upper/lower uncertainty bounds, derived AQI bucket.</p>
          </div>
        </div>
      </div>

      {/* Verified Portals & References */}
      <div className="sh-card rounded-2xl p-5 space-y-3 font-mono">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400">
          6. Verified References & Statutory Standards
        </h2>
        <ul className="space-y-2 text-xs text-slate-300 font-sans">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
            <span>
              <strong>Central Pollution Control Board (CPCB), MoEFCC</strong> (2014).
              <em> National Air Quality Index (NAQI) Final Report and Implementation Guidelines</em>. Ministry of Environment, Forest and Climate Change, Government of India.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
            <span>
              <strong>Maharashtra Pollution Control Board (MPCB)</strong>.
              <em> Continuous Ambient Air Quality Monitoring Station Network Bulletins for Mumbai Metropolitan Region</em>.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
            <span>
              <strong>Open Government Data (OGD) Platform India</strong> (data.gov.in).
              <em> Real-time and Historical Air Quality Index Data Published under National Data Sharing and Accessibility Policy (NDSAP)</em>.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
