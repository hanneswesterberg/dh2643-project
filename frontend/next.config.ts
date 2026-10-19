import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: '/api/events',
        destination: 'http://backend:8000/api/events/',
      },
      {
        source: '/api/:path*',
        destination: 'http://backend:8000/api/:path*/', // Keep Django's APPEND_SLASH routes working for POST requests.
      },
      {
        source: '/media/:path*',
        destination: 'http://backend:8000/media/:path*',
      },
    ]
  },
};

export default nextConfig;
