import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["nodemailer"],
  typescript: {
    ignoreBuildErrors: true,
  },
  // When NEXT_PUBLIC_API_URL is set (e.g. on Railway/Render), proxy /api calls to it.
  // afterFiles ensures local route handlers (like /api/auth/send-otp) execute first,
  // while backend endpoints proxy to Render.
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) return [];
    return {
      afterFiles: [
        {
          source: "/api/:path*",
          destination: `${apiUrl}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
