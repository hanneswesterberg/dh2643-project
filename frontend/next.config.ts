import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://backend:8000/api/:path*', // Routes directly to Django
      },
    ]
  },
};

export default nextConfig;
