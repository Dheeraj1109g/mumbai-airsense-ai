import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAQIColor(aqi: number | null): string {
  if (aqi === null || aqi === undefined) return "#64748b"; // slate-500
  if (aqi <= 50) return "#10b981"; // emerald-500 Good
  if (aqi <= 100) return "#84cc16"; // lime-500 Satisfactory
  if (aqi <= 200) return "#eab308"; // yellow-500 Moderate
  if (aqi <= 300) return "#f97316"; // orange-500 Poor
  if (aqi <= 400) return "#ef4444"; // red-500 Very Poor
  return "#7f1d1d"; // rose-900 Severe
}

export function getAQIBadgeClass(category: string | null): string {
  if (!category) return "bg-slate-800 text-slate-300 border-slate-700";
  const cat = category.toLowerCase();
  if (cat.includes("good")) return "bg-emerald-950/70 text-emerald-300 border-emerald-600/40";
  if (cat.includes("satisfactory")) return "bg-lime-950/70 text-lime-300 border-lime-600/40";
  if (cat.includes("moderate")) return "bg-yellow-950/70 text-yellow-300 border-yellow-600/40";
  if (cat.includes("very poor")) return "bg-red-950/70 text-red-300 border-red-600/40";
  if (cat.includes("poor")) return "bg-orange-950/70 text-orange-300 border-orange-600/40";
  if (cat.includes("severe")) return "bg-rose-950/90 text-rose-200 border-rose-500/60";
  return "bg-slate-800 text-slate-300 border-slate-700";
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  } catch {
    return dateStr;
  }
}

export function formatNum(val: number | null | undefined, decimals = 1): string {
  if (val === null || val === undefined || isNaN(val)) return "—";
  return val.toFixed(decimals);
}
