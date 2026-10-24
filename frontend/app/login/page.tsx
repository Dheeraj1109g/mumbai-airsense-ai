"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wind, ArrowRight, ShieldCheck, AlertCircle, Sparkles, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please provide both email and password.");
      return;
    }
    setLoading(true);
    setError(null);

    const res = await login(email, password);
    setLoading(false);
    if (res.success) {
      router.push("/");
    } else {
      setError(res.error || "Authentication failed. Check credentials.");
    }
  };

  const fillDemo = () => {
    setEmail("demo@airsense.in");
    setPassword("airsense2026");
  };

  return (
    <div className="flex min-h-[78vh] flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 border border-neutral-800 text-white shadow-sm mb-2">
            <Wind className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-mono">
            Log in to AirSense AI
          </h1>
          <p className="text-xs text-neutral-400 font-mono">
            Real-time telemetry, personalized alert thresholds, and 7-day neural forecasting
          </p>
        </div>

        {/* Auth Card - skills.sh / Vercel style */}
        <div className="border border-neutral-800 bg-[#0c0c0e] rounded-lg p-6 sm:p-8 space-y-5 shadow-2xl">
          {error && (
            <div className="flex items-start gap-2.5 rounded-md border border-rose-900/60 bg-rose-950/30 p-3 text-xs text-rose-300 font-mono">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-medium text-neutral-300 mb-1.5 uppercase tracking-wider">
                Citizen Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full rounded-md border border-neutral-800 bg-neutral-900/90 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 font-mono focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-mono font-medium text-neutral-300 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full rounded-md border border-neutral-800 bg-neutral-900/90 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 font-mono focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-xs font-mono font-semibold text-black hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-400 disabled:opacity-50 transition-colors cursor-pointer mt-2"
            >
              {loading ? "Authenticating..." : "Sign In with Email"}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-800" />
            </div>
            <div className="relative flex justify-center text-[10px] font-mono uppercase tracking-wider">
              <span className="bg-[#0c0c0e] px-2 text-neutral-500">Fast Demo Access</span>
            </div>
          </div>

          {/* Quick Demo Button */}
          <button
            type="button"
            onClick={fillDemo}
            className="w-full flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-900/50 px-3.5 py-2.5 text-xs font-mono text-neutral-300 hover:text-white hover:bg-neutral-800/60 hover:border-neutral-700 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span>Continue as Demo Citizen (Aarav Mehta)</span>
            </div>
            <span className="text-[10px] font-mono text-neutral-500 border border-neutral-800 px-1.5 py-0.5 rounded">
              Fill
            </span>
          </button>
        </div>

        {/* Footer links */}
        <div className="text-center text-xs font-mono text-neutral-400">
          <span>Don&apos;t have an account? </span>
          <Link href="/signup" className="text-white underline hover:text-neutral-200">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
