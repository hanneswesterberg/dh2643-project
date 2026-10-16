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
        destination: 'http://backend:8000/api/:path*', // Routes directly to Django
      },
      {
        source: '/media/:path*',
        destination: 'http://backend:8000/media/:path*',
      },
    ]
  },
};

export default nextConfig;
