import Link from "next/link";
import { Wind, ExternalLink, ShieldCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-neutral-800 bg-black text-neutral-400 text-xs font-mono">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Col 1: Brand & CPCB NAQI Architecture */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-white text-black font-bold">
                <Wind className="h-3.5 w-3.5" />
              </div>
              <span className="font-bold text-white text-sm tracking-tight font-mono">
                Mumbai AirSense AI
              </span>
              <span className="rounded border border-neutral-800 bg-neutral-900 text-neutral-400 px-1.5 py-0.2 text-[10px]">
                CAPSTONE 2026
              </span>
              <span className="rounded border border-neutral-800 bg-neutral-900 text-neutral-400 px-1.5 py-0.2 text-[10px]">
                CPCB NAQI
              </span>
            </div>
            <p className="text-neutral-400 text-xs leading-relaxed max-w-lg font-sans">
              Continuous ambient air quality monitoring and 7-day predictive atmospheric intelligence for the Mumbai Metropolitan Region (MMR).
              Implements statutory Central Pollution Control Board (CPCB) linear segmented sub-index interpolation across 8 criteria pollutants
              with multi-model validation (PyTorch LSTM, Facebook Prophet, ARIMA, and Persistence Baseline).
            </p>
            <div className="flex items-center gap-2 pt-1 text-[11px] text-neutral-500 font-mono">
              <ShieldCheck className="h-3.5 w-3.5 text-neutral-400" />
              <span>Strict Provenance Separation (Live Telemetry vs Ground Truth vs Model Forecast)</span>
            </div>
          </div>

          {/* Col 2: Verified Portals */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 font-mono">
              Verified Portals
            </h4>
            <ul className="space-y-2 text-xs font-mono">
              <li>
                <a
                  href="https://airquality.cpcb.gov.in/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1.5 text-neutral-400"
                >
                  <ExternalLink className="h-3 w-3 text-neutral-500" />
                  <span>CPCB CAAQMS Portal</span>
                </a>
              </li>
              <li>
                <a
                  href="https://mpcb.gov.in/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1.5 text-neutral-400"
                >
                  <ExternalLink className="h-3 w-3 text-neutral-500" />
                  <span>Maharashtra PCB (MPCB)</span>
                </a>
              </li>
              <li>
                <a
                  href="https://data.gov.in/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1.5 text-neutral-400"
                >
                  <ExternalLink className="h-3 w-3 text-neutral-500" />
                  <span>Open Govt Data India</span>
                </a>
              </li>
              <li>
                <a
                  href="http://safar.tropmet.res.in/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1.5 text-neutral-400"
                >
                  <ExternalLink className="h-3 w-3 text-neutral-500" />
                  <span>SAFAR (IITM Pune)</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Observatory Modules */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 font-mono">
              Observatory Modules
            </h4>
            <ul className="space-y-2 text-xs font-mono">
              <li>
                <Link href="/" className="hover:text-white transition-colors text-neutral-400">
                  Overview Telemetry
                </Link>
              </li>
              <li>
                <Link href="/map" className="hover:text-white transition-colors text-neutral-400">
                  Verified Leaflet Map
                </Link>
              </li>
              <li>
                <Link href="/forecast" className="hover:text-white transition-colors text-neutral-400">
                  7-Day Forward Projections
                </Link>
              </li>
              <li>
                <Link href="/model-lab" className="hover:text-white transition-colors text-neutral-400">
                  Model Lab & Backtests
                </Link>
              </li>
              <li>
                <Link href="/fairness" className="hover:text-white transition-colors text-neutral-400">
                  Spatial Reliability & Fairness
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors text-neutral-400">
                  Architecture & Documentation
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar in skills.sh style */}
        <div className="border-t border-neutral-900 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono text-neutral-500">
          <p>© {new Date().getFullYear()} Mumbai AirSense AI. All rights reserved.</p>
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-neutral-400">Next.js 15 App Router</span>
            </span>
            <span className="text-neutral-700">•</span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
              <span className="text-neutral-400">FastAPI 0.115</span>
            </span>
            <span className="text-neutral-700">•</span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
              <span className="text-neutral-400">PyTorch LSTM</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
