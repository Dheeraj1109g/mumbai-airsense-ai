"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  MapPin,
  TrendingUp,
  Cpu,
  Wind,
  Menu,
  X,
  Clock,
  LogOut,
  Search
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: Activity },
  { href: "/map", label: "Live Map", icon: MapPin },
  { href: "/forecast", label: "Forecast", icon: TrendingUp },
  { href: "/model-lab", label: "Model Lab", icon: Cpu },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [timeStr, setTimeStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " IST"
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-800 bg-black/95 backdrop-blur-md">
      {/* Sleek Minimalist Top Strip */}
      <div className="border-b border-neutral-900 bg-neutral-950 px-4 py-1 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between text-[11px] font-mono text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <strong className="tracking-wide">MMR TELEMETRY LIVE</strong>
            </span>
            <span className="text-neutral-700">•</span>
            <span className="text-neutral-500">14 CAAQMS Ground Nodes Verified</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-neutral-400">
              <Clock className="h-3 w-3 text-neutral-600" />
              <span className="tabular-nums">{timeStr || "Loading..."}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navbar Bar */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-white text-black font-bold">
              <Wind className="h-3.5 w-3.5" />
            </div>
            <span className="font-bold tracking-tight text-white text-sm font-mono">
              AirSense
            </span>
            <span className="rounded border border-neutral-800 bg-neutral-900 px-1.5 py-0.2 text-[9px] font-mono text-neutral-400">
              MUMBAI
            </span>
          </Link>

          {/* Minimal 4-item Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              const isMap = item.href === "/map";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono transition-colors rounded-md ${
                    isActive
                      ? "text-white bg-neutral-900 font-semibold border border-neutral-800"
                      : isMap
                      ? "text-neutral-200 hover:text-white hover:bg-neutral-900/60 font-medium"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-900/40"
                  }`}
                >
                  {isMap && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Action & Auth */}
        <div className="flex items-center gap-2.5">
          {/* Quick Search */}
          <Link
            href="/map"
            className="hidden sm:flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs font-mono text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors"
          >
            <Search className="h-3 w-3 text-neutral-500" />
            <span>Search station</span>
            <kbd className="rounded border border-neutral-800 bg-black px-1 text-[9px] text-neutral-500 font-mono">
              /
            </kbd>
          </Link>

          {/* User Auth */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-neutral-800">
              <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded-md px-2.5 py-1 text-xs font-mono text-neutral-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="font-medium truncate max-w-[100px]">{user.full_name.split(" ")[0]}</span>
              </div>
              <button
                onClick={logout}
                title="Log out"
                aria-label="Log out"
                className="p-1 rounded-md border border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link
                href="/login"
                className="px-2.5 py-1 text-xs font-mono text-neutral-300 hover:text-white transition-colors whitespace-nowrap"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs font-mono font-medium text-neutral-100 hover:bg-neutral-800 hover:border-neutral-500 transition-colors whitespace-nowrap"
              >
                Sign up
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-900 hover:text-white md:hidden transition-colors border border-neutral-800"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-b border-neutral-800 bg-neutral-950 px-4 py-3 md:hidden">
          <div className="grid grid-cols-2 gap-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-mono transition-colors ${
                    isActive
                      ? "bg-neutral-900 text-white border border-neutral-800 font-semibold"
                      : "text-neutral-400 hover:bg-neutral-900/50 hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 text-neutral-400" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
