import type { NextConfig } from "next";

const DEFAULT_BACKEND =
  process.env.NODE_ENV === "production"
    ? "https://mumbai-airsense-ai.onrender.com"
    : "http://127.0.0.1:8000";

const backendUrl = (
  process.env.NEXT_PUBLIC_API_BACKEND_URL ||
  DEFAULT_BACKEND
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;

