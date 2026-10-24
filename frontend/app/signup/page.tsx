"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wind, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const MUMBAI_STATIONS = [
  { id: "MH005", name: "Bandra, Mumbai - MPCB" },
  { id: "MH006", name: "Chhatrapati Shivaji Intl Airport (T2), Mumbai - MPCB" },
  { id: "MH007", name: "Colaba, Mumbai - MPCB" },
  { id: "MH008", name: "Kurla, Mumbai - MPCB" },
  { id: "MH009", name: "Sion, Mumbai - MPCB" },
  { id: "MH010", name: "Vile Parle West, Mumbai - IITM" },
  { id: "MH011", name: "Worli, Mumbai - MPCB" },
  { id: "MH012", name: "Borivali East, Mumbai - IITM" },
  { id: "MH013", name: "Chakala-Andheri East, Mumbai - IITM" },
  { id: "MH014", name: "Deonar, Mumbai - IITM" },
  { id: "MH015", name: "Kandivali East, Mumbai - IITM" },
  { id: "MH016", name: "Mazgaon, Mumbai - IITM" },
  { id: "MH017", name: "Malad West, Mumbai - IITM" },
  { id: "MH018", name: "Mahape, Navi Mumbai - MPCB" },
];

export default function SignUpPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [preferredStation, setPreferredStation] = useState("MH005");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setError("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    setError(null);

    const res = await signup(fullName, email, password, preferredStation);
    setLoading(false);
    if (res.success) {
      router.push("/");
    } else {
      setError(res.error || "Registration failed. Try a different email.");
    }
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
            Create an AirSense Account
          </h1>
          <p className="text-xs text-neutral-400 font-mono">
            Join the Mumbai environmental intelligence observatory network
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
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Priyanshu Sharma"
                required
                className="w-full rounded-md border border-neutral-800 bg-neutral-900/90 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 font-mono focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-neutral-300 mb-1.5 uppercase tracking-wider">
                Citizen Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="citizen@mumbai.gov.in"
                required
                className="w-full rounded-md border border-neutral-800 bg-neutral-900/90 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 font-mono focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-neutral-300 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                required
                className="w-full rounded-md border border-neutral-800 bg-neutral-900/90 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 font-mono focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-neutral-300 mb-1.5 uppercase tracking-wider">
                Default Monitoring Station
              </label>
              <select
                value={preferredStation}
                onChange={(e) => setPreferredStation(e.target.value)}
                className="w-full rounded-md border border-neutral-800 bg-neutral-900/90 px-3 py-2 text-sm text-neutral-100 font-mono focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 transition-colors"
              >
                {MUMBAI_STATIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-xs font-mono font-semibold text-black hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-400 disabled:opacity-50 transition-colors cursor-pointer mt-2"
            >
              {loading ? "Creating Citizen Profile..." : "Create Account"}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>

        {/* Footer links */}
        <div className="text-center text-xs font-mono text-neutral-400">
          <span>Already have an account? </span>
          <Link href="/login" className="text-white underline hover:text-neutral-200">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
