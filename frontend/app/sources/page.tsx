"use client";

import { useEffect, useState } from "react";
import {
  Database,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  FileText,
  Key,
  Layers,
  RefreshCw
} from "lucide-react";

import { api } from "@/lib/api";
import { DataSourceInfo } from "@/types";

export default function SourcesPage() {
  const [sources, setSources] = useState<DataSourceInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // CSV Import State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [apiKey, setApiKey] = useState<string>("mumbai-airsense-dev-secret-key-2026");
  const [uploadLoading, setUploadLoading] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<any | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    api.getDataSources()
      .then((res) => setSources(res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError("Please select a .csv file to import.");
      return;
    }
    setUploadLoading(true);
    setUploadError(null);
    setUploadResult(null);

    try {
      const res = await api.uploadCsv(uploadFile, apiKey);
      setUploadResult(res);
    } catch (err: any) {
      setUploadError(err.message || "Upload failed.");
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="sh-card rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Data Sources, Provenance & Ingestion Pipeline
          </h1>
          <span className="sh-badge text-teal-300 border-teal-500/40 bg-teal-950/40">
            PROVENANCE INTEGRITY
          </span>
        </div>
        <p className="text-xs text-slate-400 font-mono">
          Transparency documentation for all integrated Continuous Ambient Air Quality Monitoring networks,
          licensing terms, API endpoints, and custom CSV ingestion pipelines.
        </p>
      </div>

      {loading && (
        <div className="h-48 flex flex-col items-center justify-center gap-3 text-slate-400 sh-card rounded-2xl font-mono">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <span className="text-xs">Loading data source metadata...</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-xs text-red-200 font-mono">
          {error}
        </div>
      )}

      {/* Verified Sources Cards */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {sources.map((src) => (
            <div
              key={src.source_id}
              className="sh-card rounded-2xl p-5 flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <span className="sh-badge text-cyan-300 border-cyan-500/30 bg-cyan-950/40">
                      {src.type}
                    </span>
                    <h3 className="text-base font-extrabold text-white mt-1.5">{src.title}</h3>
                    <p className="text-xs text-slate-400 font-mono">{src.organization}</p>
                  </div>
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Visit ${src.title} external source`}
                    className="p-2 rounded-xl border border-white/[0.08] bg-slate-900/80 hover:bg-white/[0.08] text-slate-300 hover:text-white transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mb-3 font-sans">{src.notes}</p>

                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between py-1.5 border-t border-white/[0.06]">
                    <span className="text-slate-400">License:</span>
                    <span className="text-slate-200 font-medium text-right max-w-xs">{src.license}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-t border-white/[0.06]">
                    <span className="text-slate-400">Coverage:</span>
                    <span className="text-slate-200 font-medium">{src.coverage_period}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-t border-white/[0.06]">
                    <span className="text-slate-400">Parameters:</span>
                    <span className="text-cyan-400 text-[11px]">{src.parameters.join(", ")}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-t border-white/[0.06]">
                    <span className="text-slate-400">Access Status:</span>
                    <span className="text-emerald-400 font-semibold">{src.access_status}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CSV Import Tool & Ingestion Workflow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Form */}
        <div className="sh-card rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Ingest Custom CAAQMS CSV Dataset</h3>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Upload verified station or city observations in official CPCB format.
            Requires <code className="text-cyan-400 font-mono">StationId, Date</code> and pollutant columns.
          </p>

          <form onSubmit={handleUpload} className="space-y-4 pt-2">
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1.5 font-mono">
                CSV Data File:
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-mono file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1.5 font-mono">
                Admin Secret Key:
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter ADMIN_SECRET_KEY..."
                className="w-full rounded-lg border border-white/[0.1] bg-slate-900/90 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={uploadLoading || !uploadFile}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-teal-600 py-2.5 text-xs font-semibold text-white hover:from-cyan-500 hover:to-teal-500 disabled:opacity-50 transition-all shadow-md shadow-cyan-600/20 font-mono"
            >
              {uploadLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploadLoading ? "Validating & Ingesting Data..." : "Upload & Preprocess Observations"}
            </button>
          </form>

          {uploadResult && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-emerald-200 space-y-1 font-mono">
              <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                <CheckCircle2 className="h-4 w-4" /> Import Completed Successfully
              </div>
              <div>Job ID: #{uploadResult.id}</div>
              <div>Records Ingested: {uploadResult.records_imported}</div>
              <div>Duplicates Skipped: {uploadResult.records_skipped}</div>
            </div>
          )}

          {uploadError && (
            <div className="rounded-lg border border-red-500/30 bg-red-950/20 p-3 text-xs text-red-200 font-mono">
              {uploadError}
            </div>
          )}
        </div>

        {/* API Configuration Guide */}
        <div className="sh-card rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-teal-400" />
            <h3 className="text-sm font-bold text-white">External API Environment Configuration</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed font-mono">
            Configure live credentials in the backend <code className="text-cyan-400">.env</code> file.
            When keys are omitted, the platform gracefully operates in documented CPCB archive demonstration mode.
          </p>

          <div className="space-y-3 text-xs">
            <div className="rounded-lg bg-black/50 border border-white/[0.08] p-3 space-y-1 font-mono text-[11px] text-slate-300">
              <div className="text-slate-500"># Open Government Data India (data.gov.in) CPCB API</div>
              <div>CPCB_API_KEY=&quot;your-datagov-api-key-here&quot;</div>
              <div className="text-slate-500 mt-2"># OpenAQ REST API v3 Key</div>
              <div>OPENAQ_API_KEY=&quot;your-openaq-key-here&quot;</div>
              <div className="text-slate-500 mt-2"># Database Target (PostgreSQL or SQLite)</div>
              <div>DATABASE_URL=&quot;sqlite:///./airsense.db&quot;</div>
              <div className="text-slate-500 mt-2"># Admin Secret for secure CSV uploads</div>
              <div>ADMIN_SECRET_KEY=&quot;mumbai-airsense-dev-secret-key-2026&quot;</div>
            </div>

            <div className="rounded-lg bg-slate-900/40 border border-white/[0.06] p-3 space-y-1.5 text-[11px] text-slate-400 font-mono">
              <div className="font-semibold text-slate-300 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                Data Provenance Assurance
              </div>
              <p className="font-sans">
                Every observation in the database records its provenance tag (<code className="text-slate-300 font-mono">cpcb_historical_archive</code>, <code className="text-slate-300 font-mono">live_api</code>, or <code className="text-slate-300 font-mono">user_csv_upload</code>).
                Historical measurements are never spoofed as live telemetry.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
