import type { NextConfig } from "next";

const backendOrigin = (
  process.env.BACKEND_INTERNAL_URL ?? "http://backend:8000"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  /* config options here */
  async rewrites() {
    return [
      {
        source: '/api/events',
        destination: `${backendOrigin}/api/events/`,
      },
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*/`, // Keep Django's APPEND_SLASH routes working for POST requests.
      },
      {
        source: '/media/:path*',
        destination: `${backendOrigin}/media/:path*`,
      },
    ]
  },
};

export default nextConfig;
