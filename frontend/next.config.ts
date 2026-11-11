import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // When NEXT_PUBLIC_API_URL is set (e.g. on Railway/Render), proxy /api calls to it.
  // This way the frontend never hard-codes "localhost" anywhere.
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
