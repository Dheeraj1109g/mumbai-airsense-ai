"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { StationMapItem } from "@/types";
import MapView from "@/components/MapView";

export default function MapPage() {
  const [stations, setStations] = useState<StationMapItem[]>([]);
  const [isLiveMode, setIsLiveMode] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = isLiveMode
          ? await api.getLiveMapStations()
          : await api.getMapStations();
        if (isMounted) {
          setStations(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to load station map telemetry.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [isLiveMode]);

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-red-900/50 bg-red-950/30 p-3 text-xs text-red-200 font-mono flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setIsLiveMode(!isLiveMode)}
            className="rounded bg-neutral-900 border border-neutral-800 px-2 py-0.5 text-xs text-neutral-300 hover:text-white"
          >
            Switch to {isLiveMode ? "CPCB Archive" : "Live Feed"}
          </button>
        </div>
      )}

      {loading && stations.length === 0 ? (
        <div className="rounded-lg border border-neutral-800 bg-[#09090b] p-12 flex flex-col items-center justify-center gap-3 text-neutral-400 font-mono min-h-[500px]">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
          <span className="text-xs">Connecting to verified Mumbai CAAQMS telemetry nodes...</span>
        </div>
      ) : (
        <MapView
          stations={stations}
          isLiveMode={isLiveMode}
          onToggleMode={(mode) => setIsLiveMode(mode)}
        />
      )}
    </div>
  );
}
